-- =========================================================
-- プロフィールの追加項目(年代・性別・ひとこと)、惑星の効果音、ピン止め
--
-- - 年代・性別・ひとこと・効果音は profiles に置く(ログインユーザーなら誰でも読める)。
--   惑星の詳細に表示するため。本人しか見られない情報は private_profiles に置くこと。
-- - 効果音はアプリに入っている音から選ぶ方式。ここには音の ID だけを保存する。
--   音を増やしても DB を変えずに済むよう、ID は形式だけ確かめる。
-- =========================================================

alter table public.profiles
  add column age_group text check (age_group in ('10s', '20s', '30s', '40s', '50s_plus')),
  add column gender text check (gender in ('male', 'female', 'unspecified')),
  add column bio text not null default '' check (char_length(bio) <= 100),
  add column sound_id text check (sound_id ~ '^[a-z0-9_]{1,32}$');

-- ピン止め:気になる惑星を保存しておく。自分のピンは自分にしか見えない
create table public.pins (
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, target_user_id),
  check (user_id <> target_user_id)
);
create index pins_user_created_idx on public.pins (user_id, created_at desc);

alter table public.pins enable row level security;
create policy "pins: 本人だけ読める" on public.pins
  for select to authenticated using (user_id = (select auth.uid()));
create policy "pins: 本人だけ作れる" on public.pins
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "pins: 本人だけ消せる" on public.pins
  for delete to authenticated using (user_id = (select auth.uid()));
