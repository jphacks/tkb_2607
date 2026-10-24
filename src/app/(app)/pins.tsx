import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { TagChip } from '@/components/pill';
import { PlanetBody } from '@/components/planet-node';
import { MoreButton, Sparkle, SpaceScreen } from '@/components/space';
import { ErrorText, Loading } from '@/components/ui';
import { usePins, useSetPinned } from '@/data';
import { color, ja, radius, shadow, typography } from '@/theme/tokens';
import type { PinnedPlanet } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

const pinIcon = require('@/assets/images/home/pin-icon.png');

type Filter = 'all' | 'recent' | 'tag';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'recent', label: '最近ピン止め' },
  { value: 'tag', label: 'タグ順' },
];

// ピン止めした星の一覧。Figma: B03|ピン止め一覧
export default function PinsScreen() {
  const { data: pins, error } = usePins();
  const [filter, setFilter] = useState<Filter>('all');

  const sorted = useMemo(() => {
    if (!pins) return [];
    switch (filter) {
      case 'recent':
        // 新しくピン止めした順(データ層がこの順で返す)
        return pins;
      case 'tag':
        return [...pins].sort((x, y) =>
          (x.tags[0]?.name ?? '￿').localeCompare(y.tags[0]?.name ?? '￿', 'ja'),
        );
      default:
        return [...pins].sort((x, y) => x.nickname.localeCompare(y.nickname, 'ja'));
    }
  }, [pins, filter]);

  return (
    <SpaceScreen
      title="ピン止めした星"
      titleAside={pins && <Text style={styles.count}>{pins.length}つ</Text>}
      headerRight={<MoreButton />}
      scroll
      decor={
        <>
          <Sparkle x={50} y={400} size={10} />
          <Sparkle x={235} y={492} size={9} />
        </>
      }
    >
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <Pressable
              key={f.value}
              onPress={() => setFilter(f.value)}
              style={[styles.filter, active && styles.filterActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!pins ? (
        error ? (
          <ErrorText error={error} />
        ) : (
          <Loading />
        )
      ) : sorted.length === 0 ? (
        <Text style={styles.empty}>
          {pins.length === 0
            ? 'まだピン止めした星はありません。\n惑星の詳細の「•••」から保存できます。'
            : 'この条件に合う星はありません。'}
        </Text>
      ) : (
        <View style={styles.grid}>
          {sorted.map((pin) => (
            <PinCard key={pin.userId} pin={pin} />
          ))}
        </View>
      )}
    </SpaceScreen>
  );
}

function PinCard({ pin }: { pin: PinnedPlanet }) {
  const setPinned = useSetPinned();
  const [left, right] = pin.featuredSatellites;

  const unpin = () =>
    Alert.alert(`${pin.nickname}の惑星のピン止めを外しますか？`, undefined, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '外す',
        style: 'destructive',
        onPress: () => setPinned.mutate({ userId: pin.userId, pinned: false }),
      },
    ]);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/planet/[userId]', params: { userId: pin.userId } })}
      style={styles.card}
    >
      <View style={styles.planetArea}>
        <View style={styles.ring} />
        <PlanetBody planet={pin.planet} size={80} />
        {left && (
          <Image source={{ uri: left.imageUrl }} style={styles.satLeft} contentFit="contain" />
        )}
        {right && (
          <Image source={{ uri: right.imageUrl }} style={styles.satRight} contentFit="contain" />
        )}
      </View>
      <Pressable
        onPress={unpin}
        style={styles.pinButton}
        accessibilityRole="button"
        accessibilityLabel="ピン止めを外す"
        hitSlop={6}
      >
        <Image source={pinIcon} style={styles.pinIcon} contentFit="contain" />
      </Pressable>
      <Text style={styles.name} numberOfLines={1}>
        {pin.nickname}の惑星
      </Text>
      {pin.bio !== '' && (
        <Text style={styles.summary} numberOfLines={1}>
          {pin.bio}
        </Text>
      )}
      <View style={styles.tags}>
        {pin.tags.slice(0, 3).map((t) => (
          <TagChip key={t.id} name={t.name} size="sm" />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  count: { ...ja(typography.bodyMedium), color: color.text.onDark },
  filters: { flexDirection: 'row', gap: 7, paddingHorizontal: 24, marginTop: 18 },
  filter: {
    height: 29,
    paddingHorizontal: 14,
    borderRadius: 15,
    justifyContent: 'center',
    backgroundColor: color.bg.glass,
    borderWidth: 1,
    borderColor: color.border.onDark,
  },
  filterActive: { backgroundColor: color.bg.surface, borderColor: color.bg.surface },
  filterLabel: {
    ...ja({ ...typography.labelSmall, fontFamily: typography.bodySmall.fontFamily }),
    color: color.text.onPrimary,
  },
  filterLabelActive: { ...ja(typography.labelSmall), color: color.text.primary },
  empty: {
    ...ja(typography.bodySmall),
    color: color.text.onDark,
    textAlign: 'center',
    marginTop: 60,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 11,
    paddingHorizontal: 17,
    marginTop: 23,
  },
  card: {
    width: '48.5%',
    height: 170,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingTop: 17,
    backgroundImage:
      'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(237,235,252,0.97) 100%)',
    boxShadow: shadow.cardOnDark,
  },
  planetArea: { alignSelf: 'center', width: 112, height: 80, alignItems: 'center' },
  ring: {
    position: 'absolute',
    top: 25,
    width: 112,
    height: 32,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.decor.planetRing,
    zIndex: 2,
  },
  satLeft: { position: 'absolute', left: -8, top: 22, width: 32, height: 32, zIndex: 3 },
  satRight: { position: 'absolute', right: -6, top: 38, width: 28, height: 28, zIndex: 3 },
  pinButton: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 29,
    height: 29,
    borderRadius: radius.full,
    backgroundColor: color.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinIcon: { width: 16, height: 16 },
  name: { ...ja(typography.titleItem), color: color.text.primary, marginTop: 9 },
  summary: { ...ja(typography.captionCard), color: color.text.secondary, marginTop: 4 },
  tags: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 8,
    flexWrap: 'wrap',
    overflow: 'hidden',
    height: 16,
  },
});
