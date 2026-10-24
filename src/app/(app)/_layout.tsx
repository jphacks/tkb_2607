import { Stack } from 'expo-router';

import { ErrorText, Loading, PrimaryButton, Screen } from '@/components/ui';
import { useMyProfile } from '@/data';
import { useEncounterDetection } from '@/features/encounter';

export default function AppLayout() {
  const { data: profile, isLoading, error, refetch } = useMyProfile();
  // 惑星まで作り終えた人だけ、すれ違い検知を動かす(相手のホームに出られるのは惑星がある人だけ)
  useEncounterDetection(!!profile && profile.nickname !== '' && profile.planet !== null);
  if (isLoading) return <Loading />;
  if (!profile) {
    return (
      <Screen>
        <ErrorText error={error ?? 'プロフィールを読み込めませんでした'} />
        <PrimaryButton title="再読み込み" onPress={() => refetch()} />
      </Screen>
    );
  }

  // 初回は「プロフィール → 惑星作成 → ホーム」の順に進ませる
  const needsProfile = profile.nickname === '';
  const needsPlanet = !needsProfile && profile.planet === null;
  const ready = !needsProfile && !needsPlanet;

  return (
    <Stack>
      <Stack.Protected guard={needsProfile}>
        <Stack.Screen
          name="setup/profile"
          options={{ title: 'プロフィール', headerBackVisible: false }}
        />
      </Stack.Protected>
      <Stack.Protected guard={needsPlanet}>
        <Stack.Screen
          name="setup/planet"
          options={{ title: '惑星をつくる', headerBackVisible: false }}
        />
      </Stack.Protected>
      <Stack.Protected guard={ready}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ title: 'プロフィール' }} />
        <Stack.Screen name="satellites" options={{ title: '衛星' }} />
        <Stack.Screen name="planet/create" options={{ title: '惑星をつくりなおす' }} />
        <Stack.Screen name="planet/[userId]" options={{ title: '惑星' }} />
        <Stack.Screen name="debug" options={{ title: 'デバッグ' }} />
        <Stack.Screen name="lab/index" options={{ title: '動作確認ラボ' }} />
        <Stack.Screen name="lab/native" options={{ title: 'ネイティブ部品チェック' }} />
        <Stack.Screen name="lab/gravity" options={{ title: '引力の練習場' }} />
        <Stack.Screen name="lab/photo" options={{ title: '写真の練習場' }} />
        <Stack.Screen name="lab/ble" options={{ title: 'すれ違い検知(BLE)' }} />
      </Stack.Protected>
    </Stack>
  );
}
