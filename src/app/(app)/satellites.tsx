import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { MyPlanetHero } from '@/components/my-planet-hero';
import { PillButton } from '@/components/pill';
import { MoreButton, Sheet, SpaceScreen } from '@/components/space';
import { Loading } from '@/components/ui';
import {
  MAX_FEATURED_SATELLITES,
  useDeleteSatellite,
  useMySatellites,
  useUpdateSatellite,
} from '@/data';
import { color, ja, radius, typography } from '@/theme/tokens';
import type { Satellite } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

const imageIcon = require('@/assets/images/ui/image-icon.png');

type Mode = 'personal' | 'home';

// 衛星の一覧と、ホームに出す衛星(★)の選択。Figma: C01|惑星の位置編集
// - 個人:登録した衛星すべてを惑星の周りに出す / ホーム:ホームに出す衛星(★)だけを出す
// - 惑星サイズと、衛星の位置・角度の調整はまだデータがないので、見た目だけ
export default function SatellitesScreen() {
  const { data: satellites } = useMySatellites();
  const update = useUpdateSatellite();
  const remove = useDeleteSatellite();
  const [mode, setMode] = useState<Mode>('personal');

  if (!satellites) return <Loading />;

  const featuredCount = satellites.filter((s) => s.isFeatured).length;

  const toggleFeatured = (s: Satellite) =>
    update.mutate(
      { id: s.id, isFeatured: !s.isFeatured },
      { onError: (e) => Alert.alert(e.message) },
    );

  const confirmDelete = (id: string) =>
    Alert.alert('この衛星を削除しますか？', undefined, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => remove.mutate(id) },
    ]);

  return (
    <SpaceScreen
      title="惑星をつくる"
      subtitle={'好きな衛星を選んで、\nホームに出す衛星を決めよう。'}
      titleRight={<ModeSwitch mode={mode} onChange={setMode} />}
      headerRight={<MoreButton />}
      scroll
    >
      <MyPlanetHero satellites={mode === 'home' ? 'featured' : 'all'} />
      <Sheet style={styles.sheet}>
        <View style={styles.sizeRow}>
          <Text style={styles.section}>惑星サイズ</Text>
          <View style={styles.slider} pointerEvents="none">
            <View style={styles.track} />
            <View style={[styles.track, styles.trackActive]} />
            <View style={styles.knob} />
          </View>
        </View>
        <View style={styles.satRow}>
          <Text style={styles.section}>衛星</Text>
          <Text style={styles.count}>
            ★ {featuredCount}/{MAX_FEATURED_SATELLITES}
          </Text>
        </View>
        <Text style={styles.hint}>★ をタップするとホームに出ます。長押しで削除。</Text>

        <View style={styles.grid}>
          <Pressable
            onPress={() => router.push('/satellites/add')}
            style={[styles.tile, styles.addTile]}
            accessibilityRole="button"
          >
            <View style={styles.addCircle}>
              <Text style={styles.addPlus}>＋</Text>
            </View>
            <Text style={styles.addLabel}>衛星を追加</Text>
          </Pressable>
          {satellites.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => toggleFeatured(s)}
              onLongPress={() => confirmDelete(s.id)}
              style={[styles.tile, s.isFeatured && styles.tileSelected]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: s.isFeatured }}
            >
              <Image source={{ uri: s.imageUrl }} style={styles.tileImage} contentFit="contain" />
              <Text style={styles.star}>{s.isFeatured ? '★' : '☆'}</Text>
              {s.isFeatured && (
                <View style={styles.check}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <View style={styles.buttons}>
          <PillButton
            variant="secondary"
            title="写真選択"
            icon={<Image source={imageIcon} style={styles.buttonIcon} contentFit="contain" />}
            onPress={() => router.push('/satellites/add')}
            style={styles.button}
          />
          <PillButton title="保存する" onPress={() => router.back()} style={styles.button} />
        </View>
      </Sheet>
    </SpaceScreen>
  );
}

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <View style={styles.switch}>
      {(
        [
          ['personal', '個人'],
          ['home', 'ホーム'],
        ] as const
      ).map(([value, label]) => {
        const active = value === mode;
        return (
          <Pressable
            key={value}
            onPress={() => onChange(value)}
            style={[styles.switchItem, active && styles.switchItemActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.switchLabel, active && styles.switchLabelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const TILE = 102;

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 17, paddingTop: 30 },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 22, paddingHorizontal: 6 },
  section: { ...ja(typography.titleSection), color: color.text.primary },
  slider: { flex: 1, height: 16, justifyContent: 'center' },
  track: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: '#C1C1C1' },
  trackActive: { right: '38%', backgroundColor: color.bg.primary },
  knob: {
    position: 'absolute',
    left: '62%',
    width: 15,
    height: 15,
    marginLeft: -7,
    borderRadius: radius.full,
    backgroundColor: color.bg.primary,
    borderWidth: 3,
    borderColor: color.bg.accentSubtle,
  },
  satRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 13,
    marginTop: 14,
    paddingHorizontal: 6,
  },
  count: { ...typography.numericCount, color: '#8C8FB8' },
  hint: {
    ...ja(typography.bodyXSmall),
    color: color.text.tertiary,
    marginTop: 4,
    paddingHorizontal: 6,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 12 },
  tile: {
    width: '31.8%',
    height: TILE,
    borderRadius: radius.md,
    backgroundColor: color.bg.surface,
    borderWidth: 1,
    borderColor: color.border.neutral,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  tileSelected: { borderColor: color.border.primary, borderWidth: 1.5 },
  tileImage: { width: '86%', height: '86%' },
  star: { position: 'absolute', top: 2, right: 6, fontSize: 20, color: color.text.primary },
  check: {
    position: 'absolute',
    top: -9,
    left: -3,
    width: 21,
    height: 21,
    borderRadius: radius.full,
    backgroundColor: color.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { ...typography.titleItem, color: color.text.onPrimary },
  addTile: {
    backgroundColor: color.bg.surfaceDashed,
    borderColor: '#8C91FF',
    borderStyle: 'dashed',
    gap: 11,
  },
  addCircle: {
    width: 37,
    height: 37,
    borderRadius: radius.full,
    backgroundColor: '#F0F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlus: { ...typography.titleSection, fontSize: 17, color: color.text.primary },
  addLabel: { ...ja({ ...typography.labelButton, fontSize: 10 }), color: color.text.primary },
  buttons: { flexDirection: 'row', gap: 11, marginTop: 20 },
  button: { flex: 1 },
  buttonIcon: { width: 22, height: 18 },
  switch: {
    flexDirection: 'row',
    width: 181,
    height: 33,
    borderRadius: 16.5,
    backgroundColor: color.bg.inactive,
    borderWidth: 1,
    borderColor: color.bg.surface,
    overflow: 'hidden',
  },
  switchItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  switchItemActive: { backgroundColor: color.bg.primary },
  switchLabel: { ...ja(typography.labelSmall), color: color.text.disabled },
  switchLabelActive: { color: color.text.onPrimary },
});
