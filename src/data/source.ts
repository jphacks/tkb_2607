import type {
  AddSatelliteInput,
  AuthUser,
  BleToken,
  DummyUser,
  EncounterReport,
  EncounterReportResult,
  HomeData,
  MyProfile,
  PinnedPlanet,
  PlanetDetail,
  Satellite,
  SavePlanetInput,
  SoundId,
  Tag,
  UpdateProfileInput,
  UpdateSatelliteInput,
  UserId,
} from '@/types/domain';

export type Credentials = {
  email: string;
  password: string;
};

/**
 * データの読み書きの窓口。mock と supabase の2つの実装があり、EXPO_PUBLIC_DATA_MODE で切り替わる。
 * 画面や機能からは直接使わず、src/data/index.ts のフック経由で使う。
 */
export interface DataSource {
  // 認証
  getCurrentUser(): Promise<AuthUser | null>;
  onAuthChange(listener: (user: AuthUser | null) => void): () => void;
  signIn(credentials: Credentials): Promise<void>;
  signUp(credentials: Credentials): Promise<void>;
  signOut(): Promise<void>;

  // プロフィール
  getMyProfile(): Promise<MyProfile>;
  updateMyProfile(input: UpdateProfileInput): Promise<void>;
  searchTags(query: string): Promise<Tag[]>;
  /** 惑星の効果音を選ぶ。null で「なし」に戻す */
  updateMySound(soundId: SoundId | null): Promise<void>;

  // 惑星・衛星
  savePlanet(input: SavePlanetInput): Promise<void>;
  /** 自分の惑星の大きさ(倍率)を変える。惑星がまだなければ何もしない */
  updateMyPlanetScale(sizeScale: number): Promise<void>;
  listMySatellites(): Promise<Satellite[]>;
  addSatellite(input: AddSatelliteInput): Promise<Satellite>;
  updateSatellite(id: string, input: UpdateSatelliteInput): Promise<void>;
  deleteSatellite(id: string): Promise<void>;

  // ホーム・詳細
  getHome(limit: number): Promise<HomeData>;
  /** その週の角度を保存する。先に保存されていた・週が変わっていたら false */
  saveHomeAngles(periodStart: string, angles: ReadonlyMap<UserId, number>): Promise<boolean>;
  getPlanetDetail(userId: UserId): Promise<PlanetDetail>;

  // ピン止め(自分のピンは自分にしか見えない)
  /** 新しくピン止めした順 */
  listPins(): Promise<PinnedPlanet[]>;
  /** すでにピン止めしていても失敗しない */
  pin(targetUserId: UserId): Promise<void>;
  unpin(targetUserId: UserId): Promise<void>;

  // すれ違い
  getBleToken(): Promise<BleToken>;
  reportEncounter(report: EncounterReport): Promise<EncounterReportResult>;

  // デモ
  listDummyUsers(): Promise<DummyUser[]>;
  demoAddEncounter(targetUserId: UserId): Promise<void>;
  /** 自分の顔ぶれを捨てる。次にホームを開いたときに選び直される(角度も計算し直し) */
  demoResetHomeLineup(): Promise<void>;
}

/** ホームで1つの惑星の周りに出す衛星の上限 */
export const MAX_FEATURED_SATELLITES = 3;

/** すれ違いがこの回数以上の相手にだけ、ホームで本名を見せる(サーバーの get_home_candidates と同じ値) */
export const REAL_NAME_MIN_ENCOUNTERS = 5;
