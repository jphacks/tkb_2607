import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorText, Loading, PrimaryButton, Screen } from '@/components/ui';
import { useHome, useSaveHomeAngles } from '@/data';
import { GravityView } from '@/features/gravity';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

// ホーム。引力の描画(GravityView)は引力・描画担当の差し込み口
export default function HomeScreen() {
  const { data, error, refetch } = useHome(20);
  const saveAngles = useSaveHomeAngles();

  if (!data) {
    return error ? (
      <Screen>
        <ErrorText error={error} />
        <PrimaryButton title="再読み込み" onPress={() => refetch()} />
      </Screen>
    ) : (
      <Loading />
    );
  }

  return (
    <View style={styles.container}>
      <GravityView
        me={data.me}
        candidates={data.candidates}
        onPressPlanet={(userId) =>
          router.push({ pathname: '/planet/[userId]', params: { userId } })
        }
        angles={data.lineup.angles}
        onAnglesComputed={(angles) =>
          saveAngles.mutate({ periodStart: data.lineup.periodStart, angles })
        }
      />
      <SafeAreaView style={styles.menu} edges={['top']} pointerEvents="box-none">
        <MenuButton label="プロフィール" onPress={() => router.push('/profile')} />
        <MenuButton label="衛星" onPress={() => router.push('/satellites')} />
        <MenuButton label="ラボ" onPress={() => router.push('/lab')} />
      </SafeAreaView>
    </View>
  );
}

function MenuButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.menuButton}>
      <Text style={styles.menuText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  menu: { position: 'absolute', top: 0, right: 12, flexDirection: 'row', gap: 8 },
  menuButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  menuText: { color: '#fff', fontSize: 13 },
});
