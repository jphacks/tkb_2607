-- =========================================================
-- デモ・開発用のダミーユーザー(12人)。誰が開いても、ホームに惑星が並ぶ状態にする。
-- 顔ぶれ・ニックネームは mock モードのダミー(src/data/mock/fixtures.ts)とそろえている。
--
-- 流し方は supabase/seed/README.md を参照。何度流しても同じ状態になる(先にダミーを全部消してから入れる)。
-- 消すだけなら:delete from public.profiles where is_dummy;
-- 画像は Storage の planets/dummy/ と satellites/dummy/ に置く(Figma の水彩の惑星と衛星を書き出したもの)。
-- =========================================================

delete from public.profiles where is_dummy;

create temporary table dummy_seed (
  n integer,
  nickname text,
  organization text,
  age_group text,
  gender text,
  bio text,
  sound_id text,
  planet text,
  palette jsonb,
  tags text[],
  satellites text[],
  encounter_count integer
);

insert into dummy_seed values
  (1,  'そら',   'JPHUCK大学', '20s',      'female',      '空の写真を撮るのが好き。晴れた日はだいたい屋上にいます。', 'kirarin',  'p01', '["#B0B4AE","#DBDDC3","#7E8396"]', '{写真サークル}',        '{camera,cat,book}',        12),
  (2,  'みかん', 'JPHUCK大学', '20s',      'male',        'みかんは皮ごと食べる派。',                                 'pow',      'p10', '["#D0A382","#EBD1A0","#A77A70"]', '{}',                    '{guitar,drink,suitcase}',   8),
  (3,  'もも',   null,         '10s',      'female',      '春の景色を集めた星。',                                     'shararan', 'p04', '["#AC7E82","#C1979A","#98676C"]', '{写真サークル}',        '{bouquet,camera,cat}',      5),
  (4,  'あお',   'JPHUCK大学', '20s',      'unspecified', 'カフェ巡りが趣味です。おすすめ教えてください。',           'poyon',    'p03', '["#829CBA","#A7BECB","#5E77AE"]', '{カフェ部}',            '{drink,book,bouquet}',      3),
  (5,  'くるみ', null,         '30s',      'male',        '',                                                         'pyon',     'p09', '["#D3BA97","#F4E3C6","#A2907B"]', '{カフェ部}',            '{suitcase,guitar,camera}',  2),
  (6,  'わかば', 'JPHUCK大学', '20s',      'female',      '植物を育てています。',                                     'kyururun', 'p06', '["#8FC8C5","#C6ECEA","#659F9C"]', '{}',                    '{bouquet,cat,drink}',       1),
  (7,  'ゆず',   null,         '20s',      'female',      '朝のコーヒーがないと始まらない。',                         'kirarin',  'p07', '["#C7C2B4","#F0EADE","#95958E"]', '{}',                    '{drink,suitcase,book}',     4),
  (8,  'すみれ', null,         '40s',      'female',      '写真とカフェの記録をつけています。',                       'shararan', 'p02', '["#A5CCC9","#DBEDEC","#7FA19E"]', '{写真サークル,カフェ部}', '{camera,drink,bouquet}',    0),
  (9,  'こはく', 'JPHUCK大学', '20s',      'male',        'ギターを練習中。',                                         'pow',      'p08', '["#C2C0C0","#E8E7E4","#969697"]', '{}',                    '{guitar,cat,suitcase}',     0),
  (10, 'しずく', null,         '10s',      'unspecified', '雨の日が好き。',                                           'poyon',    'p05', '["#99BFCF","#CBE5EC","#6F94A9"]', '{}',                    '{book,bouquet,camera}',     0),
  (11, 'ほたる', null,         '30s',      'female',      '夜の散歩でいい景色を探しています。',                       'kyururun', 'p02', '["#A5CCC9","#DBEDEC","#7FA19E"]', '{カフェ部}',            '{suitcase,camera,drink}',   0),
  (12, 'ひなた', null,         '50s_plus', 'male',        '旅行の計画を立てるのが好き。',                             'pyon',     'p09', '["#D3BA97","#F4E3C6","#A2907B"]', '{}',                    '{suitcase,guitar,book}',    1);

-- ID は決まった値にする(何度流しても同じ人になる)
alter table dummy_seed add column id uuid;
update dummy_seed set id = ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;

insert into public.profiles (id, nickname, organization, age_group, gender, bio, sound_id, is_dummy)
  select id, nickname, organization, age_group, gender, bio, sound_id, true from dummy_seed;

insert into public.private_profiles (user_id) select id from dummy_seed;

insert into public.planets (user_id, image_path, palette)
  select id, 'dummy/' || planet || '.png', palette from dummy_seed;

-- 衛星は3つずつ、全部ホームに出す
insert into public.satellites (user_id, image_path, is_featured, sort_order)
  select d.id, 'dummy/' || s.name || '.png', true, s.ord - 1
  from dummy_seed d, unnest(d.satellites) with ordinality as s(name, ord);

insert into public.tags (name)
  select distinct unnest(tags) from dummy_seed
  on conflict (name) do nothing;

insert into public.user_tags (user_id, tag_id)
  select d.id, t.id from dummy_seed d join public.tags t on t.name = any (d.tags);

-- ダミーではない全員と、決まった回数だけすれ違ったことにする(過去2週間に散らばるように)
insert into public.encounters (user_a, user_b, detected_at, rssi)
  select least(d.id, p.id), greatest(d.id, p.id), now() - ((i * 27 + 3) || ' hours')::interval, -60
  from dummy_seed d
  cross join public.profiles p
  cross join generate_series(0, d.encounter_count - 1) as i
  where not p.is_dummy;

-- 今週のホームの顔ぶれを選び直してもらう(次にホームを開いたときに、ダミーも入れて選ばれる)
delete from public.home_lineups;

drop table dummy_seed;
