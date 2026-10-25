-- 惑星の大きさ(倍率)を追加する。1 が標準の大きさ。
-- 上限はアプリ側(src/features/gravity/planet-scale.ts)で、ホームの配置の計算で惑星どうしが重ならない大きさから決める。
-- ここでは明らかにおかしい値だけを弾く。
alter table public.planets
  add column if not exists size_scale double precision not null default 1
  check (size_scale > 0 and size_scale <= 2);

-- 20261025100000_add_organization.sql の get_home_candidates を元に、戻り値に planet_size_scale を足して作り直す
-- (相手の惑星もその人が決めた大きさでホームに描くため)
drop function public.get_home_candidates(integer);
create function public.get_home_candidates(p_limit integer default 20)
returns table (
  user_id uuid,
  nickname text,
  organization text,
  planet_image_path text,
  palette jsonb,
  planet_size_scale double precision,
  featured_satellites jsonb,
  shared_tag_count integer,
  tag_union_count integer,
  encounter_count integer,
  last_encounter_at timestamptz,
  encounter_timestamps timestamptz[],
  lineup_period_start timestamptz,
  angle double precision
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_period timestamptz := public.home_period_start();
  v_lineup public.home_lineups;
  v_members uuid[];
  -- 自分の所属団体(前後の空白・大文字小文字だけそろえる。アプリ側の scoring.ts と同じ判定)
  v_org text := (select nullif(lower(btrim(p.organization)), '') from public.profiles p where p.id = auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_lineup from public.home_lineups l where l.user_id = v_uid;

  -- 今週の顔ぶれがまだなければ選ぶ
  if not found or v_lineup.period_start < v_period then
    with my_tags as (
      select ut.tag_id from public.user_tags ut where ut.user_id = v_uid
    ),
    others as (
      select p.id,
        coalesce(nullif(lower(btrim(p.organization)), '') = v_org, false) as same_org
      from public.profiles p
      join public.planets pl on pl.user_id = p.id
      where p.id <> v_uid
    ),
    tag_stats as (
      select o.id, o.same_org,
        count(ut.tag_id) filter (where ut.tag_id in (select tag_id from my_tags))::integer as shared
      from others o
      left join public.user_tags ut on ut.user_id = o.id
      group by o.id, o.same_org
    ),
    enc as (
      select
        case when e.user_a = v_uid then e.user_b else e.user_a end as other_id,
        count(*)::integer as cnt
      from public.encounters e
      where v_uid in (e.user_a, e.user_b)
      group by 1
    ),
    scored as (
      select ts.id, ts.shared + ts.same_org::integer as shared, coalesce(enc.cnt, 0) as cnt,
        (ts.shared > 0 or coalesce(enc.cnt, 0) > 0 or ts.same_org) as related
      from tag_stats ts
      left join enc on enc.other_id = ts.id
    ),
    ranked as (
      select s.*,
        row_number() over (
          partition by s.related
          order by case when s.related then s.cnt + s.shared end desc nulls last, random()
        ) as rn,
        count(*) filter (where s.related) over () as related_total
      from scored s
    ),
    picked as (
      select r.* from ranked r
      where (r.related and r.rn <= greatest(p_limit - 3, 0))
         or (not r.related and r.rn <= p_limit - least(r.related_total, greatest(p_limit - 3, 0)))
    )
    select coalesce(array_agg(pk.id order by pk.related desc, pk.cnt + pk.shared desc, pk.rn), '{}')
      into v_members
      from picked pk;

    -- 同時に2回呼ばれても、先に入った方を使う
    insert into public.home_lineups as l (user_id, period_start, member_ids, angles)
      values (v_uid, v_period, v_members, null)
      on conflict on constraint home_lineups_pkey do update
        set period_start = excluded.period_start,
            member_ids = excluded.member_ids,
            angles = null,
            created_at = now()
        where l.period_start < excluded.period_start;

    select * into v_lineup from public.home_lineups l where l.user_id = v_uid;
  end if;

  return query
    with my_tags as (
      select ut.tag_id from public.user_tags ut where ut.user_id = v_uid
    ),
    members as (
      select m.id, m.ord
      from unnest(v_lineup.member_ids) with ordinality as m(id, ord)
    ),
    tag_stats as (
      select m.id,
        count(ut.tag_id) filter (where ut.tag_id in (select tag_id from my_tags))::integer as shared,
        count(ut.tag_id)::integer as theirs
      from members m
      left join public.user_tags ut on ut.user_id = m.id
      group by m.id
    ),
    enc as (
      select
        case when e.user_a = v_uid then e.user_b else e.user_a end as other_id,
        count(*)::integer as cnt,
        max(e.detected_at) as last_at,
        array_agg(e.detected_at order by e.detected_at desc) as ts
      from public.encounters e
      where v_uid in (e.user_a, e.user_b)
      group by 1
    )
    select
      p.id,
      p.nickname,
      p.organization,
      pl.image_path,
      pl.palette,
      pl.size_scale,
      coalesce((
        select jsonb_agg(jsonb_build_object('id', f.id, 'image_path', f.image_path) order by f.sort_order)
        from (
          select sa.id, sa.image_path, sa.sort_order from public.satellites sa
          where sa.user_id = p.id and sa.is_featured
          order by sa.sort_order
          limit 3
        ) f
      ), '[]'::jsonb),
      ts.shared,
      ((select count(*) from my_tags) + ts.theirs - ts.shared)::integer,
      coalesce(enc.cnt, 0),
      enc.last_at,
      coalesce(enc.ts, '{}'),
      v_lineup.period_start,
      (v_lineup.angles ->> p.id::text)::double precision
    -- 週の途中で退会した人・惑星を消した人は出さない
    from members m
    join public.profiles p on p.id = m.id
    join public.planets pl on pl.user_id = p.id
    join tag_stats ts on ts.id = m.id
    left join enc on enc.other_id = m.id
    order by m.ord;
end;
$$;

revoke execute on function public.get_home_candidates(integer) from anon, public;
grant execute on function public.get_home_candidates(integer) to authenticated;
