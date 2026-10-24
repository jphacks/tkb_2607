import { Image } from 'expo-image';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Loading, Screen } from '@/components/ui';
import {
  MAX_FEATURED_SATELLITES,
  useAddSatellite,
  useDeleteSatellite,
  useMySatellites,
  useUpdateSatellite,
} from '@/data';
import { SatelliteCreator } from '@/features/photo';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

// 衛星の一覧と、ホームに出す衛星の選択。衛星を作る部分(SatelliteCreator)は写真担当の差し込み口
export default function SatellitesScreen() {
  const { data: satellites } = useMySatellites();
  const add = useAddSatellite();
  const update = useUpdateSatellite();
  const remove = useDeleteSatellite();

  if (!satellites) return <Loading />;

  const toggleFeatured = (id: string, isFeatured: boolean) =>
    update.mutate({ id, isFeatured: !isFeatured }, { onError: (e) => Alert.alert(e.message) });

  const confirmDelete = (id: string) =>
    Alert.alert('この衛星を削除しますか?', undefined, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => remove.mutate(id) },
    ]);

  return (
    <Screen>
      <SatelliteCreator onComplete={async (result) => void (await add.mutateAsync(result))} />
      <Text>
        ★ をタップすると、ホームで惑星の周りに出ます(最大{MAX_FEATURED_SATELLITES}
        つ)。長押しで削除。
      </Text>
      <View style={styles.grid}>
        {satellites.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => toggleFeatured(s.id, s.isFeatured)}
            onLongPress={() => confirmDelete(s.id)}
            style={styles.item}
          >
            <Image source={{ uri: s.imageUrl }} style={styles.image} contentFit="contain" />
            <Text style={styles.star}>{s.isFeatured ? '★' : '☆'}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: { width: 96, alignItems: 'center' },
  image: { width: 96, height: 96, backgroundColor: '#f2f2f2', borderRadius: 8 },
  star: { fontSize: 20 },
});
