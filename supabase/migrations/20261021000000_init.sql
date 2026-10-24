-- Perigee 初期スキーマ
-- 方針:全テーブルで RLS を有効化する。他人の本名は読めない。すれ違いの記録は RPC 経由でのみ書く。

-- =========================================================
-- テーブル
-- =========================================================

-- 公開プロフィール。ダミー(is_dummy)はログインしないので auth.users とは外部キーでつながない
create table public.profiles (
  id uuid primary key,
  nickname text not null default '',
  sound_path text,
  is_dummy boolean not null default false,
  created_at timestamptz not null default now()
);

-- 本名など本人しか見られない情報
create table public.private_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  real_name text
);

create table public.planets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- 画像がないダミーは null(色だけで描く)
  image_path text,
  palette jsonb not null default '[]'::jsonb,
  source_photo_path text,
  updated_at timestamptz not null default now()
);

create table public.satellites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  image_path text not null,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index satellites_user_id_idx on public.satellites (user_id);

create table public.tags (
  id bigint generated always as identity primary key,
  name text not null unique check (char_length(name) between 1 and 40)
);

create table public.user_tags (
  user_id uuid not null references public.profiles (id) on delete cascade,
  tag_id bigint not null references public.tags (id) on delete cascade,
  primary key (user_id, tag_id)
);
create index user_tags_tag_id_idx on public.user_tags (tag_id);

-- すれ違い用の一時ID(15分でローテーション)
create table public.ble_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  valid_from timestamptz not null,
  valid_until timestamptz not null
);
create index ble_tokens_user_id_idx on public.ble_tokens (user_id, valid_until desc);

-- 1件 = 1回のすれ違い。ペアは user_a < user_b に正規化する
create table public.encounters (
  id bigint generated always as identity primary key,
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  detected_at timestamptz not null,
  rssi integer,
  reported_by uuid references public.profiles (id) on delete set null,
  check (user_a < user_b)
);
create index encounters_pair_idx on public.encounters (user_a, user_b, detected_at desc);
create index encounters_user_b_idx on public.encounters (user_b);

-- =========================================================
-- 新規登録時にプロフィールを作る
-- =========================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.private_profiles (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- ホームに出す衛星は1人3つまで
-- =========================================================

create function public.check_featured_satellites()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_featured and (
    select count(*) from public.satellites
    where user_id = new.user_id and is_featured and id <> new.id
  ) >= 3 then
    raise exception 'featured_satellites_limit' using hint = 'ホームに出せる衛星は3つまでです';
  end if;
  return new;
end;
$$;

create trigger satellites_featured_limit
  before insert or update of is_featured on public.satellites
  for each row execute function public.check_featured_satellites();

-- =========================================================
-- RLS
-- =========================================================

alter table public.profiles enable row level security;
alter table public.private_profiles enable row level security;
alter table public.planets enable row level security;
alter table public.satellites enable row level security;
alter table public.tags enable row level security;
alter table public.user_tags enable row level security;
alter table public.ble_tokens enable row level security;
alter table public.encounters enable row level security;

create policy "profiles: ログインユーザーは読める" on public.profiles
  for select to authenticated using (true);
create policy "profiles: 本人だけ更新できる" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "private_profiles: 本人だけ読める" on public.private_profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "private_profiles: 本人だけ更新できる" on public.private_profiles
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "planets: ログインユーザーは読める" on public.planets
  for select to authenticated using (true);
create policy "planets: 本人だけ作れる" on public.planets
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "planets: 本人だけ更新できる" on public.planets
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "satellites: ログインユーザーは読める" on public.satellites
  for select to authenticated using (true);
create policy "satellites: 本人だけ作れる" on public.satellites
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "satellites: 本人だけ更新できる" on public.satellites
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "satellites: 本人だけ消せる" on public.satellites
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "tags: ログインユーザーは読める" on public.tags
  for select to authenticated using (true);

create policy "user_tags: ログインユーザーは読める" on public.user_tags
  for select to authenticated using (true);

-- ble_tokens は RPC からだけ触る(ポリシーなし = 直接は読み書きできない)

create policy "encounters: 当事者だけ読める" on public.encounters
  for select to authenticated using ((select auth.uid()) in (user_a, user_b));

-- =========================================================
-- RPC
-- =========================================================

-- 自分のタグをまとめて置き換える(存在しないタグは作る)
create function public.set_my_tags(p_names text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_names text[];
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select coalesce(array_agg(distinct trim(n)), '{}')
    into v_names
    from unnest(p_names) as n
    where trim(n) <> '';

  insert into public.tags (name)
    select unnest(v_names)
    on conflict (name) do nothing;

  delete from public.user_tags
    where user_id = v_uid
      and tag_id not in (select id from public.tags where name = any (v_names));

  insert into public.user_tags (user_id, tag_id)
    select v_uid, id from public.tags where name = any (v_names)
    on conflict do nothing;
end;
$$;

-- 有効な一時IDを返す(残り2分を切っていたら新しく発行する)
create function public.issue_ble_token()
returns table (token text, valid_until timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  return query
    select t.token, t.valid_until from public.ble_tokens t
    where t.user_id = v_uid and t.valid_from <= now() and t.valid_until > now() + interval '2 minutes'
    order by t.valid_until desc
    limit 1;
  if found then
    return;
  end if;

  return query
    insert into public.ble_tokens as t (token, user_id, valid_from, valid_until)
    values (left(replace(gen_random_uuid()::text, '-', ''), 16), v_uid, now(), now() + interval '15 minutes')
    returning t.token, t.valid_until;
end;
$$;

-- すれ違いの報告。片方が検知すれば、そのペアの1回として記録する
create function public.report_encounter(p_token text, p_rssi integer, p_detected_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_peer uuid;
  v_at timestamptz := least(p_detected_at, now());
  v_a uuid;
  v_b uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- 報告が遅れて届くこともあるので、有効期限の前後に余裕を持たせる
  select user_id into v_peer from public.ble_tokens
    where token = p_token
      and v_at between valid_from - interval '5 minutes' and valid_until + interval '15 minutes';
  if v_peer is null then
    return jsonb_build_object('recorded', false, 'reason', 'unknown_token');
  end if;
  if v_peer = v_uid then
    return jsonb_build_object('recorded', false, 'reason', 'self');
  end if;
  -- RSSI のしきい値(端末側の mock と同じ値にそろえる)
  if p_rssi < -85 then
    return jsonb_build_object('recorded', false, 'reason', 'weak_signal');
  end if;

  v_a := least(v_uid, v_peer);
  v_b := greatest(v_uid, v_peer);

  -- 双方が同時に報告しても1件になるよう、ペアごとに直列化する
  perform pg_advisory_xact_lock(hashtext(v_a::text || v_b::text));

  if exists (
    select 1 from public.encounters
    where user_a = v_a and user_b = v_b
      and detected_at between v_at - interval '30 minutes' and v_at + interval '30 minutes'
  ) then
    return jsonb_build_object('recorded', false, 'reason', 'duplicate');
  end if;

  insert into public.encounters (user_a, user_b, detected_at, rssi, reported_by)
    values (v_a, v_b, v_at, p_rssi, v_uid);
  return jsonb_build_object('recorded', true, 'reason', 'ok');
end;
$$;

-- ホームに出す候補。引力の計算に必要な材料を返す(スコアは端末で計算する想定)
-- 母集団:共通タグがある人 + すれ違いがある人 + 関係のない人からランダムに数人(「偶然」の演出)
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
    select p.id, p.nickname, pl.image_path, pl.palette
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

-- デモ用:ダミーユーザーとのすれ違いを1件足す(相手がダミーのときだけ)
create function public.demo_add_encounter(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from public.profiles where id = p_target_user_id and is_dummy) then
    raise exception 'target_is_not_dummy';
  end if;

  insert into public.encounters (user_a, user_b, detected_at, rssi, reported_by)
    values (least(v_uid, p_target_user_id), greatest(v_uid, p_target_user_id), now(), -50, v_uid);
end;
$$;

revoke execute on function public.set_my_tags(text[]) from anon, public;
revoke execute on function public.issue_ble_token() from anon, public;
revoke execute on function public.report_encounter(text, integer, timestamptz) from anon, public;
revoke execute on function public.get_home_candidates(integer) from anon, public;
revoke execute on function public.demo_add_encounter(uuid) from anon, public;
grant execute on function public.set_my_tags(text[]) to authenticated;
grant execute on function public.issue_ble_token() to authenticated;
grant execute on function public.report_encounter(text, integer, timestamptz) to authenticated;
grant execute on function public.get_home_candidates(integer) to authenticated;
grant execute on function public.demo_add_encounter(uuid) to authenticated;

-- =========================================================
-- Storage(画像は URL で表示するので公開バケット。書き込みは自分のフォルダだけ)
-- パスは「<user_id>/<ファイル名>」
-- =========================================================

insert into storage.buckets (id, name, public)
values ('planets', 'planets', true), ('satellites', 'satellites', true), ('sounds', 'sounds', true)
on conflict (id) do nothing;

create policy "storage: 自分のフォルダに追加できる" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('planets', 'satellites', 'sounds')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "storage: 自分のフォルダを更新できる" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('planets', 'satellites', 'sounds')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "storage: 自分のフォルダから消せる" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('planets', 'satellites', 'sounds')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
