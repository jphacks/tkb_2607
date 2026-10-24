import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SpaceBackground } from '@/components/space-background';
import { getSampleHome } from '@/data';
import { GravityView } from '@/features/gravity';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

// 引力の練習場:固定の見本データで GravityView を表示する。データ層や他の担当の作業を待たずに描画を試せる。
const COUNTS = [0, 3, 12, 30];

export default function GravityLabScreen() {
  const [count, setCount] = useState(12);
  const [tapped, setTapped] = useState<string | null>(null);
  const home = useMemo(() => getSampleHome(count), [count]);

  return (
    <View style={styles.container}>
      <SpaceBackground />
      <GravityView
        me={home.me}
        candidates={home.candidates}
        onPressPlanet={(userId) =>
          setTapped(
            userId === home.me.userId
              ? '自分'
              : (home.candidates.find((c) => c.userId === userId)?.nickname ?? userId),
          )
        }
      />
      <View style={styles.panel} pointerEvents="box-none">
        <View style={styles.row}>
          {COUNTS.map((n) => (
            <Pressable
              key={n}
              onPress={() => setCount(n)}
              style={[styles.chip, n === count && styles.chipActive]}
            >
              <Text style={styles.chipText}>{n}人</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.status}>タップした惑星:{tapped ?? 'なし'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  panel: { position: 'absolute', left: 12, right: 12, bottom: 32, gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: 'rgba(255,255,255,0.4)' },
  chipText: { color: '#fff' },
  status: { color: '#fff' },
});
