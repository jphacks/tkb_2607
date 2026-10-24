// モックモードのダミーデータ。シード(supabase/seed)と同じ顔ぶれにそろえる。

export type FixtureUser = {
  id: string;
  nickname: string;
  palette: string[];
  /** 所属団体(正式名称)。未所属なら null */
  organization: string | null;
  tags: string[];
  /** 自分とのすれ違い回数(よく / たまに / ゼロ の濃淡をつける) */
  encounterCount: number;
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
};

export const DUMMY_FIXTURES: FixtureUser[] = [
  {
    id: 'dummy-01',
    nickname: 'そら',
    palette: ['#7FB3D5', '#D6EAF8', '#2E86C1'],
    organization: 'JPHUCK大学',
    tags: ['写真サークル'],
    encounterCount: 12,
  },
  {
    id: 'dummy-02',
    nickname: 'みかん',
    palette: ['#F5B041', '#FAD7A0', '#DC7633'],
    organization: 'JPHUCK大学',
    tags: [],
    encounterCount: 8,
  },
  {
    id: 'dummy-03',
    nickname: 'もも',
    palette: ['#F1948A', '#FADBD8', '#C0392B'],
    organization: null,
    tags: ['写真サークル'],
    encounterCount: 5,
  },
  {
    id: 'dummy-04',
    nickname: 'あお',
    palette: ['#5DADE2', '#AED6F1', '#1B4F72'],
    organization: 'JPHUCK大学',
    tags: ['カフェ部'],
    encounterCount: 3,
  },
  {
    id: 'dummy-05',
    nickname: 'くるみ',
    palette: ['#A0522D', '#DEB887', '#6E2C00'],
    organization: null,
    tags: ['カフェ部'],
    encounterCount: 2,
  },
  {
    id: 'dummy-06',
    nickname: 'わかば',
    palette: ['#82E0AA', '#D5F5E3', '#1E8449'],
    organization: 'JPHUCK大学',
    tags: [],
    encounterCount: 1,
  },
  {
    id: 'dummy-07',
    nickname: 'ゆず',
    palette: ['#F7DC6F', '#FCF3CF', '#B7950B'],
    organization: null,
    tags: [],
    encounterCount: 4,
  },
  {
    id: 'dummy-08',
    nickname: 'すみれ',
    palette: ['#BB8FCE', '#E8DAEF', '#6C3483'],
    organization: null,
    tags: ['写真サークル', 'カフェ部'],
    encounterCount: 0,
  },
  {
    id: 'dummy-09',
    nickname: 'こはく',
    palette: ['#E59866', '#F6DDCC', '#A04000'],
    organization: 'JPHUCK大学',
    tags: [],
    encounterCount: 0,
  },
  {
    id: 'dummy-10',
    nickname: 'しずく',
    palette: ['#76D7C4', '#D1F2EB', '#117A65'],
    organization: null,
    tags: [],
    encounterCount: 0,
  },
  {
    id: 'dummy-11',
    nickname: 'ほたる',
    palette: ['#F9E79F', '#566573', '#212F3D'],
    organization: null,
    tags: ['カフェ部'],
    encounterCount: 0,
  },
  {
    id: 'dummy-12',
    nickname: 'ひなた',
    palette: ['#FAD7A0', '#F8C471', '#CA6F1E'],
    organization: null,
    tags: [],
    encounterCount: 1,
  },
];
