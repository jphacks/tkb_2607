// アプリ全体で使うドメイン型。DB の型(Supabase CLI で生成)とは分け、変換は src/data/ の中で行う。
// 既存の型の変更・削除は全員に影響するので、Claude Code と影響範囲を確認してから行うこと。

/** ユーザーID(Supabase Auth の user.id と同じ) */
export type UserId = string;

export type AuthUser = {
  id: UserId;
  email: string | null;
};

export type Planet = {
  /** 惑星画像の URL。画像がまだない場合(ダミーなど)は null で、palette の色で描く */
  imageUrl: string | null;
  /** 惑星の色(例: "#E8A0B4")。先頭ほど代表的な色 */
  palette: string[];
  /** 惑星の大きさの倍率(1 が標準)。範囲は @/features/gravity の PLANET_SCALE_RANGE。衛星の大きさは変えない */
  sizeScale: number;
};

export type SatelliteSummary = {
  id: string;
  imageUrl: string;
};

export type Satellite = SatelliteSummary & {
  /** ホームで惑星の周りに表示するか(1人3つまで) */
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
};

export type Tag = {
  id: number;
  name: string;
};

/** 年代(生年月日の代わりに登録する) */
export type AgeGroup = '10s' | '20s' | '30s' | '40s' | '50s_plus';

/** 性別。'unspecified' は「登録しない」を選んだ人 */
export type Gender = 'male' | 'female' | 'unspecified';

/** 惑星の効果音の ID(アプリに入っている音から選ぶ。一覧は src/lib/planet-sounds.ts) */
export type SoundId = string;

export type MyProfile = {
  userId: UserId;
  /** 未設定なら空文字(初回のプロフィール設定がまだ) */
  nickname: string;
  /** 本人にしか見えない本名 */
  realName: string | null;
  /** 所属団体(大学名・会社名など、正式名称)。タグとは別。未入力なら null */
  organization: string | null;
  tags: Tag[];
  /** まだ作っていなければ null */
  planet: Planet | null;
  /** 未入力なら null */
  ageGroup: AgeGroup | null;
  /** 未入力なら null */
  gender: Gender | null;
  /** ひとこと(100文字まで)。未入力なら空文字 */
  bio: string;
  /** 惑星の効果音。選んでいなければ null */
  soundId: SoundId | null;
};

export type UpdateProfileInput = {
  nickname: string;
  realName: string | null;
  /** 所属団体(正式名称)。タグとは別で、引力の組織マッチングに使う */
  organization: string | null;
  /** タグ名の一覧。存在しないタグは新しく作られる */
  tagNames: string[];
  /** 以下は省略すると今の値のまま */
  ageGroup?: AgeGroup | null;
  gender?: Gender | null;
  bio?: string;
};

/** ホームの中心に出る自分 */
export type HomeUser = {
  userId: UserId;
  nickname: string;
  /** 所属団体(正式名称)。相手との組織マッチング判定に使う */
  organization: string | null;
  planet: Planet | null;
  featuredSatellites: SatelliteSummary[];
};

/** ホームに出る候補ユーザー。引力の計算に必要な材料を持つ */
export type HomeCandidate = {
  userId: UserId;
  nickname: string;
  /** 所属団体(正式名称)。自分の organization と比較して組織マッチングに使う */
  organization: string | null;
  planet: Planet;
  /** 最大3つ */
  featuredSatellites: SatelliteSummary[];
  /** 自分と共通のタグの数 */
  sharedTagCount: number;
  /** 2人のタグの和集合の数(Jaccard 係数 = sharedTagCount / tagUnionCount) */
  tagUnionCount: number;
  /** すれ違った回数 */
  encounterCount: number;
  lastEncounterAt: string | null;
  /** すれ違った日時(新しい順)。時間減衰を端末で計算するときに使う */
  encounterTimestamps: string[];
  /** サーバーでスコアを計算する場合だけ入る */
  score?: number;
};

/**
 * ホームの顔ぶれ。顔ぶれと角度は週に1回(月曜 0:00、日本時間)だけ変わる。
 * 半径の材料(すれ違い回数など)は candidates に毎回最新が入る。
 */
export type HomeLineup = {
  /** この顔ぶれの週の始まり(ISO 文字列)。角度を保存するときにそのまま渡す */
  periodStart: string;
  /** その週に保存した角度(userId → ラジアン)。まだ計算していなければ null */
  angles: ReadonlyMap<UserId, number> | null;
};

export type HomeData = {
  me: HomeUser;
  /** 週に1回だけ入れ替わる。並び順は選んだときの関係の強さの順 */
  candidates: HomeCandidate[];
  lineup: HomeLineup;
};

export type PlanetDetail = {
  userId: UserId;
  nickname: string;
  planet: Planet | null;
  satellites: SatelliteSummary[];
  tags: Tag[];
  ageGroup: AgeGroup | null;
  gender: Gender | null;
  bio: string;
  soundId: SoundId | null;
  /** 自分がこの惑星をピン止めしているか */
  isPinned: boolean;
};

/** ピン止めした惑星(ピン止め一覧に出す) */
export type PinnedPlanet = {
  userId: UserId;
  nickname: string;
  planet: Planet | null;
  /** 最大3つ */
  featuredSatellites: SatelliteSummary[];
  tags: Tag[];
  bio: string;
  soundId: SoundId | null;
  pinnedAt: string;
};

export type SavePlanetInput = {
  /** 生成した惑星画像(端末内のファイル URI、透過 PNG) */
  planetImageUri: string;
  palette: string[];
  /** 元の写真(端末内のファイル URI) */
  sourcePhotoUri: string;
};

export type AddSatelliteInput = {
  /** 切り抜いた画像(端末内のファイル URI、透過 PNG) */
  imageUri: string;
};

export type UpdateSatelliteInput = {
  isFeatured?: boolean;
  sortOrder?: number;
};

/** すれ違い検知用の一時ID */
export type BleToken = {
  token: string;
  validUntil: string;
};

export type EncounterReport = {
  /** 相手から読み取った一時ID */
  token: string;
  rssi: number;
  detectedAt: string;
};

export type EncounterReportResult = {
  recorded: boolean;
  reason: 'ok' | 'unknown_token' | 'self' | 'weak_signal' | 'duplicate';
};

/** デモ用のダミーユーザー */
export type DummyUser = {
  userId: UserId;
  nickname: string;
  encounterCount: number;
};
