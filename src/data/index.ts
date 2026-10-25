// データ層の公開窓口。画面(src/app)と機能(src/features)は、ここからだけデータを読み書きする。
// 新しいフックの追加は自由。既存のフックの引数・戻り値を変えるときは、使っている場所を確認してから。

import { useMutation, useQuery } from '@tanstack/react-query';

import type {
  AddSatelliteInput,
  EncounterReport,
  HomeData,
  SavePlanetInput,
  SoundId,
  UpdateProfileInput,
  UpdateSatelliteInput,
  UserId,
} from '@/types/domain';

import { useAuth } from './auth';
import { queryClient } from './query-client';
import type { Credentials } from './source';
import { source } from './source-instance';

export { AuthProvider, useAuth } from './auth';
export { queryClient } from './query-client';
export { MAX_FEATURED_SATELLITES, type Credentials } from './source';
export { getSampleHome } from './samples';

export const queryKeys = {
  myProfile: (userId: UserId | undefined) => ['myProfile', userId] as const,
  home: (userId: UserId | undefined, limit: number) => ['home', userId, limit] as const,
  planetDetail: (userId: UserId) => ['planetDetail', userId] as const,
  mySatellites: (userId: UserId | undefined) => ['mySatellites', userId] as const,
  tagSearch: (query: string) => ['tagSearch', query] as const,
  dummyUsers: (userId: UserId | undefined) => ['dummyUsers', userId] as const,
  pins: (userId: UserId | undefined) => ['pins', userId] as const,
};

const invalidate = (...keys: string[]) =>
  Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));

// ---------- 認証 ----------

export const signIn = (credentials: Credentials) => source.signIn(credentials);
export const signUp = (credentials: Credentials) => source.signUp(credentials);
export const signOut = () => source.signOut();

// ---------- プロフィール ----------

export function useMyProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.myProfile(user?.id),
    queryFn: () => source.getMyProfile(),
    enabled: !!user,
  });
}

export function useUpdateMyProfile() {
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => source.updateMyProfile(input),
    onSuccess: () => invalidate('myProfile', 'home', 'planetDetail', 'pins'),
  });
}

export function useUpdateMySound() {
  return useMutation({
    mutationFn: (soundId: SoundId | null) => source.updateMySound(soundId),
    onSuccess: () => invalidate('myProfile', 'planetDetail', 'pins'),
  });
}

export function useTagSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.tagSearch(query),
    queryFn: () => source.searchTags(query),
    enabled: query.trim().length > 0,
  });
}

// ---------- 惑星・衛星 ----------

export function useSavePlanet() {
  return useMutation({
    mutationFn: (input: SavePlanetInput) => source.savePlanet(input),
    onSuccess: () => invalidate('myProfile', 'home', 'planetDetail'),
  });
}

export function useUpdateMyPlanetScale() {
  return useMutation({
    mutationFn: (sizeScale: number) => source.updateMyPlanetScale(sizeScale),
    onSuccess: () => invalidate('myProfile', 'home', 'planetDetail', 'pins'),
  });
}

export function useMySatellites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.mySatellites(user?.id),
    queryFn: () => source.listMySatellites(),
    enabled: !!user,
  });
}

export function useAddSatellite() {
  return useMutation({
    mutationFn: (input: AddSatelliteInput) => source.addSatellite(input),
    onSuccess: () => invalidate('mySatellites', 'home', 'planetDetail'),
  });
}

export function useUpdateSatellite() {
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateSatelliteInput & { id: string }) =>
      source.updateSatellite(id, input),
    onSuccess: () => invalidate('mySatellites', 'home', 'planetDetail'),
  });
}

export function useDeleteSatellite() {
  return useMutation({
    mutationFn: (id: string) => source.deleteSatellite(id),
    onSuccess: () => invalidate('mySatellites', 'home', 'planetDetail'),
  });
}

// ---------- ホーム・詳細 ----------

/** ホームの半径(すれ違い回数など)を取り直す間隔。顔ぶれと角度はサーバー側で週に1回だけ変わる */
export const HOME_REFRESH_MS = 30 * 60 * 1000;

export function useHome(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.home(user?.id, limit),
    queryFn: () => source.getHome(limit),
    enabled: !!user,
    staleTime: HOME_REFRESH_MS,
    refetchInterval: HOME_REFRESH_MS,
  });
}

/** その週に初めて計算した角度を保存する。保存できなかった(先に保存されていた)ら、保存済みの角度を取り直す */
export function useSaveHomeAngles() {
  return useMutation({
    mutationFn: ({
      periodStart,
      angles,
    }: {
      periodStart: string;
      angles: ReadonlyMap<UserId, number>;
    }) => source.saveHomeAngles(periodStart, angles),
    onSuccess: (saved, { periodStart, angles }) => {
      if (!saved) return invalidate('home');
      // 次の取り直し(30分後)を待たずに、手元のデータも保存済みにする
      queryClient.setQueriesData<HomeData>({ queryKey: ['home'] }, (old) =>
        old && old.lineup.periodStart === periodStart
          ? { ...old, lineup: { ...old.lineup, angles } }
          : old,
      );
    },
  });
}

export function usePlanetDetail(userId: UserId) {
  return useQuery({
    queryKey: queryKeys.planetDetail(userId),
    queryFn: () => source.getPlanetDetail(userId),
  });
}

// ---------- ピン止め ----------

export function usePins() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.pins(user?.id),
    queryFn: () => source.listPins(),
    enabled: !!user,
  });
}

/** pinned: true でピン止め、false で外す */
export function useSetPinned() {
  return useMutation({
    mutationFn: ({ userId, pinned }: { userId: UserId; pinned: boolean }) =>
      pinned ? source.pin(userId) : source.unpin(userId),
    onSuccess: () => invalidate('pins', 'planetDetail'),
  });
}

// ---------- すれ違い(BLE から呼ぶ。フックではなく関数) ----------

export const getBleToken = () => source.getBleToken();

export async function reportEncounter(report: EncounterReport) {
  const result = await source.reportEncounter(report);
  // ホームの半径は30分ごとに取り直す(useHome)ので、ここではホームを取り直さない
  if (result.recorded) await invalidate('dummyUsers');
  return result;
}

// ---------- デモ ----------

export function useDummyUsers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.dummyUsers(user?.id),
    queryFn: () => source.listDummyUsers(),
    enabled: !!user,
  });
}

export function useDemoAddEncounter() {
  return useMutation({
    mutationFn: (targetUserId: UserId) => source.demoAddEncounter(targetUserId),
    onSuccess: () => invalidate('home', 'dummyUsers'),
  });
}

export function useDemoResetHomeLineup() {
  return useMutation({
    mutationFn: () => source.demoResetHomeLineup(),
    onSuccess: () => invalidate('home'),
  });
}
