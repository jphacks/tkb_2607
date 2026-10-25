-- 惑星の詳細画面に本名を出すための関数。すれ違いが5回以上の相手の本名だけを返す(それ以外・未登録は null)。
-- private_profiles は本人しか読めない(RLS)ままにして、この関数(security definer)の中だけで、条件を満たす相手の本名を読む。
-- 条件はホームの get_home_candidates(20261025170000_home_real_name.sql)と同じ。
-- 5 回はアプリ側(src/data/source.ts の REAL_NAME_MIN_ENCOUNTERS)と同じ値にそろえる。
create function public.get_visible_real_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(btrim(pp.real_name), '')
  from public.private_profiles pp
  where pp.user_id = p_user_id
    and (
      select count(*)
      from public.encounters e
      where e.user_a = least(auth.uid(), p_user_id)
        and e.user_b = greatest(auth.uid(), p_user_id)
    ) >= 5;
$$;

revoke execute on function public.get_visible_real_name(uuid) from anon, public;
grant execute on function public.get_visible_real_name(uuid) to authenticated;
