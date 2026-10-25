import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SpaceBackground } from '@/components/space-background';
import { SpaceDecorLayer } from '@/components/space-decor-layer';
import { getSampleHome } from '@/data';
import { GravityView, type AngularMode } from '@/features/gravity';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

// 角度の練習場:惑星の角度の決め方(3案)を、固定の見本データで見比べる。
// 「すれ違い+」で30分ごとの更新(距離だけ変わる)を再現し、角度が固定されたままかも確かめられる。
const COUNTS = [3, 12, 13, 30];
const MODES: { mode: AngularMode; label: string }[] = [
  { mode: 'rails-jitter', label: 'レール+ずらす' },
  { mode: 'rails', label: 'レール' },
  { mode: 'golden', label: 'ひまわり' },
];

export default function GravityAngularLabScreen() {
  const [count, setCount] = useState(13);
  const [mode, setMode] = useState<AngularMode>('rails-jitter');
  const [extraEncounters, setExtraEncounters] = useState(0);
  const home = useMemo(() => {
    const sample = getSampleHome(count);
    // 番号が奇数の人だけすれ違い回数を増やし、距離の変わり方に差をつける
    const candidates = sample.candidates.map((c, i) =>
      i % 2 === 1 ? { ...c, encounterCount: c.encounterCount + extraEncounters } : c,
    );
    return { ...sample, candidates };
  }, [count, extraEncounters]);

  return (
    <View style={styles.container}>
      <SpaceBackground />
      <SpaceDecorLayer />
      <GravityView
        me={home.me}
        candidates={home.candidates}
        angularMode={mode}
        onPressPlanet={() => {}}
      />
      <View style={styles.panel} pointerEvents="box-none">
        <View style={styles.row}>
          {MODES.map((m) => (
            <Pressable
              key={m.mode}
              onPress={() => setMode(m.mode)}
              style={[styles.chip, m.mode === mode && styles.chipActive]}
            >
              <Text style={styles.chipText}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          {COUNTS.map((n) => (
            <Pressable
              key={n}
              onPress={() => {
                setCount(n);
                setExtraEncounters(0);
              }}
              style={[styles.chip, n === count && styles.chipActive]}
            >
              <Text style={styles.chipText}>{n}人</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          <Pressable onPress={() => setExtraEncounters((v) => v + 3)} style={styles.chip}>
            <Text style={styles.chipText}>すれ違い+3(30分更新)</Text>
          </Pressable>
          <Pressable onPress={() => setExtraEncounters(0)} style={styles.chip}>
            <Text style={styles.chipText}>戻す</Text>
          </Pressable>
        </View>
        <Text style={styles.status}>追加のすれ違い:{extraEncounters}回(奇数番の人だけ)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  panel: { position: 'absolute', left: 12, right: 12, bottom: 32, gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
