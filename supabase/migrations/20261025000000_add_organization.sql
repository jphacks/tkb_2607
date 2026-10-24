-- 所属団体(大学名・会社名など、正式名称)を追加する。タグとは別で、引力の組織マッチング判定に使う。
alter table public.profiles add column organization text;

-- get_home_candidates の戻り値に organization を追加するため、列構成が変わる関数は作り直す。
drop function if exists public.get_home_candidates(integer);

create function public.get_home_candidates(p_limit integer default 20)
returns table (
  user_id uuid,
  nickname text,
  organization text,
  planet_image_path text,
  palette jsonb,
  featured_satellites jsonb,
  shared_tag_count integer,
  tag_union_count integer,
  encounter_count integer,
  last_encounter_at timestamptz,
  encounter_timestamps timestamptz[]
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select auth.uid() as id
  ),
  my_tags as (
    select ut.tag_id from public.user_tags ut where ut.user_id = (select id from me)
  ),
  others as (
    select p.id, p.nickname, p.organization, pl.image_path, pl.palette
    from public.profiles p
    join public.planets pl on pl.user_id = p.id
    where p.id <> (select id from me)
  ),
  tag_stats as (
    select o.id,
      count(ut.tag_id) filter (where ut.tag_id in (select tag_id from my_tags))::integer as shared,
      count(ut.tag_id)::integer as theirs
    from others o
    left join public.user_tags ut on ut.user_id = o.id
    group by o.id
  ),
  enc as (
    select
      case when e.user_a = (select id from me) then e.user_b else e.user_a end as other_id,
      count(*)::integer as cnt,
      max(e.detected_at) as last_at,
      array_agg(e.detected_at order by e.detected_at desc) as ts
    from public.encounters e
    where (select id from me) in (e.user_a, e.user_b)
    group by 1
  ),
  scored as (
    select o.*, ts.shared, ts.theirs,
      coalesce(enc.cnt, 0) as cnt, enc.last_at, coalesce(enc.ts, '{}') as ts_list,
      (ts.shared > 0 or coalesce(enc.cnt, 0) > 0) as related
    from others o
    join tag_stats ts on ts.id = o.id
    left join enc on enc.other_id = o.id
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
  select
    pk.id,
    pk.nickname,
    pk.organization,
    pk.image_path,
    pk.palette,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', f.id, 'image_path', f.image_path) order by f.sort_order)
      from (
        select sa.id, sa.image_path, sa.sort_order from public.satellites sa
        where sa.user_id = pk.id and sa.is_featured
        order by sa.sort_order
        limit 3
      ) f
    ), '[]'::jsonb),
    pk.shared,
    ((select count(*) from my_tags) + pk.theirs - pk.shared)::integer,
    pk.cnt,
    pk.last_at,
    pk.ts_list
  from picked pk
  order by pk.related desc, pk.cnt + pk.shared desc;
$$;

revoke execute on function public.get_home_candidates(integer) from anon, public;
grant execute on function public.get_home_candidates(integer) to authenticated;
