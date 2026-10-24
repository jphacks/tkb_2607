import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorText, Loading, Screen } from '@/components/ui';
import { usePlanetDetail } from '@/data';

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
          <Image source={{ uri: data.planet.imageUrl }} style={styles.planet} />
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

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 8 },
  planet: { width: 200, height: 200, borderRadius: 100 },
  name: { fontSize: 20, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  satellite: { width: 96, height: 96 },
});
