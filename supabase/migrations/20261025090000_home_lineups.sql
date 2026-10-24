-- =========================================================
-- ホームの顔ぶれを週に1回だけ選び直し、その週の惑星の角度を保存する
--
-- 引力担当の決定事項:
--   週に1回   … 表示する人の顔ぶれ、全員の角度、半径が変わる
--   30分ごと … 半径(すれ違い回数などによる距離)だけが変わる
-- 顔ぶれと角度はこの表に保存して、週の途中では変えない。
-- すれ違い回数などの材料は、get_home_candidates が毎回最新を返す(取り直す間隔はアプリ側で決める)。
-- =========================================================

create table public.home_lineups (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- この顔ぶれの週の始まり(月曜 0:00、日本時間)
  period_start timestamptz not null,
  -- 表示する人(並び順は選んだときの関係の強さの順)
  member_ids uuid[] not null,
  -- 引力担当が計算した角度(userId → ラジアン)。その週にまだ計算していなければ null
  angles jsonb,
  created_at timestamptz not null default now()
);

alter table public.home_lineups enable row level security;
create policy "home_lineups: 本人だけ読める" on public.home_lineups
  for select to authenticated using (user_id = (select auth.uid()));
-- 書き込みは RPC からだけ(ポリシーなし = 直接は書けない)

-- 今の週の始まり(月曜 0:00、日本時間)
create function public.home_period_start()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select date_trunc('week', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo';
$$;

-- ホームに出す候補。顔ぶれは週に1回だけ選び、材料(すれ違い回数・タグ)は毎回最新を返す。
-- 顔ぶれの選び方は以前と同じ:共通タグがある人 + すれ違いがある人 + 関係のない人からランダムに数人(「偶然」の演出)
drop function public.get_home_candidates(integer);
create function public.get_home_candidates(p_limit integer default 20)
returns table (
  user_id uuid,
  nickname text,
  planet_image_path text,
  palette jsonb,
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
      select p.id
      from public.profiles p
      join public.planets pl on pl.user_id = p.id
      where p.id <> v_uid
    ),
    tag_stats as (
      select o.id,
        count(ut.tag_id) filter (where ut.tag_id in (select tag_id from my_tags))::integer as shared
      from others o
      left join public.user_tags ut on ut.user_id = o.id
      group by o.id
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
      select ts.id, ts.shared, coalesce(enc.cnt, 0) as cnt,
        (ts.shared > 0 or coalesce(enc.cnt, 0) > 0) as related
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
      pl.image_path,
      pl.palette,
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

-- その週の角度を保存する。先に保存した方を使う(週の途中で角度が変わらないように)。
-- 週が変わって顔ぶれが選び直されていたら保存しない。保存できたら true
create function public.save_home_angles(p_period_start timestamptz, p_angles jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if jsonb_typeof(p_angles) is distinct from 'object' then
    raise exception 'invalid_angles';
  end if;

  update public.home_lineups l
    set angles = p_angles
    where l.user_id = v_uid and l.period_start = p_period_start and l.angles is null;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

-- デモ・動作確認用:自分の顔ぶれを捨てる。次にホームを開いたときに選び直される(角度も計算し直し)
create function public.demo_reset_home_lineup()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.home_lineups where user_id = (select auth.uid());
$$;

revoke execute on function public.home_period_start() from anon, public;
revoke execute on function public.get_home_candidates(integer) from anon, public;
revoke execute on function public.save_home_angles(timestamptz, jsonb) from anon, public;
revoke execute on function public.demo_reset_home_lineup() from anon, public;
grant execute on function public.home_period_start() to authenticated;
grant execute on function public.get_home_candidates(integer) to authenticated;
grant execute on function public.save_home_angles(timestamptz, jsonb) to authenticated;
grant execute on function public.demo_reset_home_lineup() to authenticated;
