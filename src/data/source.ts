import type {
  AddSatelliteInput,
  AuthUser,
  BleToken,
  DummyUser,
  EncounterReport,
  EncounterReportResult,
  HomeData,
  MyProfile,
  PlanetDetail,
  Satellite,
  SavePlanetInput,
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

  // 惑星・衛星
  savePlanet(input: SavePlanetInput): Promise<void>;
  listMySatellites(): Promise<Satellite[]>;
  addSatellite(input: AddSatelliteInput): Promise<Satellite>;
  updateSatellite(id: string, input: UpdateSatelliteInput): Promise<void>;
  deleteSatellite(id: string): Promise<void>;

  // ホーム・詳細
  getHome(limit: number): Promise<HomeData>;
  /** その週の角度を保存する。先に保存されていた・週が変わっていたら false */
  saveHomeAngles(periodStart: string, angles: ReadonlyMap<UserId, number>): Promise<boolean>;
  getPlanetDetail(userId: UserId): Promise<PlanetDetail>;

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
