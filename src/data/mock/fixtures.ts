// モックモードのダミーデータ。シード(supabase/seed)と同じ顔ぶれにそろえる。
import type { AgeGroup, Gender } from '@/types/domain';

export type FixtureUser = {
  id: string;
  nickname: string;
  /** 本名(すれ違いが5回以上の相手のホームにだけ、名前ラベルに出る)。シードと同じ */
  realName: string;
  palette: string[];
  /** 所属団体(正式名称)。未所属なら null */
  organization: string | null;
  tags: string[];
  /** 自分とのすれ違い回数(よく / たまに / ゼロ の濃淡をつける) */
  encounterCount: number;
  ageGroup?: AgeGroup;
  gender?: Gender;
  bio?: string;
  soundId?: string;
};

export const MOCK_ME_ID = 'mock-me';

export const ME_FIXTURE = {
  id: MOCK_ME_ID,
  email: 'me@example.com',
  nickname: 'わたし',
  realName: '山田 太郎',
  organization: 'JPHUCK大学',
  palette: ['#F4B6C2', '#B5D8EB', '#FFE5A5'],
  tags: ['写真サークル'],
  ageGroup: '20s' as AgeGroup,
  gender: 'unspecified' as Gender,
  bio: '好きなものを集めた星。音楽を聴きながら、いろんな場所に行ってみたい。',
  soundId: 'kirarin',
};

export const DUMMY_FIXTURES: FixtureUser[] = [
  {
    id: 'dummy-01',
    nickname: 'そら',
    realName: '青木 空',
    palette: ['#7FB3D5', '#D6EAF8', '#2E86C1'],
    organization: 'JPHUCK大学',
    tags: ['写真サークル'],
    encounterCount: 12,
    ageGroup: '20s',
    gender: 'female',
    bio: '空の写真を撮るのが好き。晴れた日はだいたい屋上にいます。',
    soundId: 'kirarin',
  },
  {
    id: 'dummy-02',
    nickname: 'みかん',
    realName: '橘 蜜柑',
    palette: ['#F5B041', '#FAD7A0', '#DC7633'],
    organization: 'JPHUCK大学',
    tags: [],
    encounterCount: 8,
    ageGroup: '20s',
    gender: 'male',
    bio: 'みかんは皮ごと食べる派。',
    soundId: 'pow',
  },
  {
    id: 'dummy-03',
    nickname: 'もも',
    realName: '桃井 花',
    palette: ['#F1948A', '#FADBD8', '#C0392B'],
    organization: null,
    tags: ['写真サークル'],
    encounterCount: 5,
    ageGroup: '10s',
    gender: 'female',
    bio: '春の景色を集めた星。',
    soundId: 'shararan',
  },
  {
    id: 'dummy-04',
    nickname: 'あお',
    realName: '青山 葵',
    palette: ['#5DADE2', '#AED6F1', '#1B4F72'],
    organization: 'JPHUCK大学',
    tags: ['カフェ部'],
    encounterCount: 3,
    ageGroup: '20s',
    gender: 'unspecified',
    bio: 'カフェ巡りが趣味です。おすすめ教えてください。',
    soundId: 'poyon',
  },
  {
    id: 'dummy-05',
    nickname: 'くるみ',
    realName: '栗田 胡桃',
    palette: ['#A0522D', '#DEB887', '#6E2C00'],
    organization: null,
    tags: ['カフェ部'],
    encounterCount: 2,
    ageGroup: '30s',
    gender: 'male',
    bio: '',
    soundId: 'pyon',
  },
  {
    id: 'dummy-06',
    nickname: 'わかば',
    realName: '若林 葉月',
    palette: ['#82E0AA', '#D5F5E3', '#1E8449'],
    organization: 'JPHUCK大学',
    tags: [],
    encounterCount: 1,
    ageGroup: '20s',
    gender: 'female',
    bio: '植物を育てています。',
    soundId: 'kyururun',
  },
  {
    id: 'dummy-07',
    nickname: 'ゆず',
    realName: '柚木 結',
    palette: ['#F7DC6F', '#FCF3CF', '#B7950B'],
    organization: null,
    tags: [],
    encounterCount: 4,
  },
  {
    id: 'dummy-08',
    nickname: 'すみれ',
    realName: '紫野 澄',
    palette: ['#BB8FCE', '#E8DAEF', '#6C3483'],
    organization: null,
    tags: ['写真サークル', 'カフェ部'],
    encounterCount: 0,
  },
  {
    id: 'dummy-09',
    nickname: 'こはく',
    realName: '古川 琥珀',
    palette: ['#E59866', '#F6DDCC', '#A04000'],
    organization: 'JPHUCK大学',
    tags: [],
    encounterCount: 0,
  },
  {
    id: 'dummy-10',
    nickname: 'しずく',
    realName: '雫石 澪',
    palette: ['#76D7C4', '#D1F2EB', '#117A65'],
    organization: null,
    tags: [],
    encounterCount: 0,
  },
  {
    id: 'dummy-11',
    nickname: 'ほたる',
    realName: '星野 蛍',
    palette: ['#F9E79F', '#566573', '#212F3D'],
    organization: null,
    tags: ['カフェ部'],
    encounterCount: 0,
  },
  {
    id: 'dummy-12',
    nickname: 'ひなた',
    realName: '日向 陽',
    palette: ['#FAD7A0', '#F8C471', '#CA6F1E'],
    organization: null,
    tags: [],
    encounterCount: 1,
  },
];
