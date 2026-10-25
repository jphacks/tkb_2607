import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SpaceBackground } from '@/components/space-background';
import { SpaceDecorLayer } from '@/components/space-decor-layer';
import { getSampleHome } from '@/data';
import { GravityView } from '@/features/gravity';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

// 引力の練習場:固定の見本データで GravityView を表示する。データ層や他の担当の作業を待たずに描画を試せる。
// 保存済みの週の角度は使わず、いつもその場で角度を計算する。下の切り替えで、広がり方の数値(config.ts の layout)を見比べられる。
const COUNTS = [0, 3, 12, 30];
/** 強さに順位を混ぜる割合(rankBlend) */
const RANK_BLENDS = [0, 0.5, 1];
/** はみ出しの許容(visibleMarginFactor) */
const MARGINS = [0, 0.2, 0.4];

/** 数値を選ぶチップの1列 */
function ChipRow({
  label,
  values,
  selected,
  format,
  onSelect,
}: {
  label: string;
  values: number[];
  selected: number;
  format: (value: number) => string;
  onSelect: (value: number) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {values.map((value) => (
        <Pressable
          key={value}
          onPress={() => onSelect(value)}
          style={[styles.chip, value === selected && styles.chipActive]}
        >
          <Text style={styles.chipText}>{format(value)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function GravityLabScreen() {
  const [count, setCount] = useState(12);
  const [rankBlend, setRankBlend] = useState(0);
  const [margin, setMargin] = useState(0.2);
  const [tapped, setTapped] = useState<string | null>(null);
  const home = useMemo(() => getSampleHome(count), [count]);

  return (
    <View style={styles.container}>
      <SpaceBackground />
      <SpaceDecorLayer />
      <GravityView
        me={home.me}
        candidates={home.candidates}
        layoutOverrides={{ rankBlend, visibleMarginFactor: margin }}
        onPressPlanet={(userId) =>
          setTapped(
            userId === home.me.userId
              ? '自分'
              : (home.candidates.find((c) => c.userId === userId)?.nickname ?? userId),
          )
        }
      />
      <View style={styles.panel} pointerEvents="box-none">
        <ChipRow
          label="人数"
          values={COUNTS}
          selected={count}
          format={(n) => `${n}人`}
          onSelect={setCount}
        />
        <ChipRow
          label="順位を混ぜる"
          values={RANK_BLENDS}
          selected={rankBlend}
          format={String}
          onSelect={setRankBlend}
        />
        <ChipRow
          label="はみ出し"
          values={MARGINS}
          selected={margin}
          format={String}
          onSelect={setMargin}
        />

        <Text style={styles.status}>タップした惑星:{tapped ?? 'なし'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  panel: { position: 'absolute', left: 12, right: 12, bottom: 32, gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  rowLabel: { color: '#fff', width: 84 },
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
