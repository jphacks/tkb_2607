import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorText, Loading, Screen } from '@/components/ui';
import { usePlanetDetail } from '@/data';
import { PLANET_BODY_RATIO } from '@/features/photo';

// 惑星の詳細(全衛星とタグ)
export default function PlanetDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { data, error } = usePlanetDetail(userId);

  if (!data) return error ? <ErrorText error={error} /> : <Loading />;

  return (
    <Screen>
      <Stack.Screen options={{ title: data.nickname }} />
      <View style={styles.center}>
        {data.planet?.imageUrl ? (
          // 写真担当の惑星の画像は背景が透明で、本体のまわりに余白がある。丸く切らずに、
          // 本体の直径が PLANET_SIZE になる大きさで中央に置く(ホームの planet-node.tsx と同じ)
          <View style={styles.planetBox}>
            <Image
              source={{ uri: data.planet.imageUrl }}
              contentFit="contain"
              style={styles.planetImage}
            />
          </View>
        ) : (
          <View style={[styles.planet, { backgroundColor: data.planet?.palette[0] ?? '#999' }]} />
        )}
        <Text style={styles.name}>{data.nickname}</Text>
        <Text>{data.tags.map((t) => `#${t.name}`).join('  ')}</Text>
      </View>
      <View style={styles.grid}>
        {data.satellites.map((s) => (
          <Image
            key={s.id}
            source={{ uri: s.imageUrl }}
            style={styles.satellite}
            contentFit="contain"
          />
        ))}
      </View>
    </Screen>
  );
}

/** 惑星の本体の直径(px) */
const PLANET_SIZE = 200;
/** 惑星の画像の1辺(px)。本体の直径が PLANET_SIZE になる大きさ */
const PLANET_IMAGE_SIZE = PLANET_SIZE / PLANET_BODY_RATIO;

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 8 },
  planet: { width: PLANET_SIZE, height: PLANET_SIZE, borderRadius: PLANET_SIZE / 2 },
  planetBox: { width: PLANET_SIZE, height: PLANET_SIZE },
  planetImage: {
    position: 'absolute',
    width: PLANET_IMAGE_SIZE,
    height: PLANET_IMAGE_SIZE,
    left: (PLANET_SIZE - PLANET_IMAGE_SIZE) / 2,
    top: (PLANET_SIZE - PLANET_IMAGE_SIZE) / 2,
  },
  name: { fontSize: 20, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  satellite: { width: 96, height: 96 },
});
