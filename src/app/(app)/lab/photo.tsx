import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui';
import { PlanetCreator, SatelliteCreator } from '@/features/photo';
import type { SavePlanetInput } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

// 写真の練習場:PlanetCreator / SatelliteCreator を、保存せずに試す。
// 受け取った結果(画像 URI・色)をそのまま表示するので、土台に渡る形を確認できる。
export default function PhotoLabScreen() {
  const [planet, setPlanet] = useState<SavePlanetInput | null>(null);
  const [satellite, setSatellite] = useState<string | null>(null);

  return (
    <Screen>
      <Text style={styles.heading}>惑星づくり(PlanetCreator)</Text>
      <PlanetCreator onComplete={async (result) => setPlanet(result)} />
      {planet && (
        <View style={styles.result}>
          <Text style={styles.label}>土台が受け取った結果</Text>
          <View style={styles.row}>
            <Preview uri={planet.sourcePhotoUri} caption="元の写真" />
            <Preview uri={planet.planetImageUri} caption="惑星" />
          </View>
          <View style={styles.row}>
            {planet.palette.map((color, i) => (
              <View key={`${color}-${i}`} style={[styles.swatch, { backgroundColor: color }]} />
            ))}
          </View>
          <Text style={styles.mono}>palette: {JSON.stringify(planet.palette)}</Text>
        </View>
      )}

      <Text style={styles.heading}>衛星づくり(SatelliteCreator)</Text>
      <SatelliteCreator onComplete={async ({ imageUri }) => setSatellite(imageUri)} />
      {satellite && (
        <View style={styles.result}>
          <Text style={styles.label}>土台が受け取った結果</Text>
          <Preview uri={satellite} caption="衛星" checkered />
        </View>
      )}
    </Screen>
  );
}

function Preview({
  uri,
  caption,
  checkered,
}: {
  uri: string;
  caption: string;
  checkered?: boolean;
}) {
  return (
    <View style={styles.preview}>
      {/* 切り抜きの透過が分かるように、衛星は背景に色をつける */}
      <Image
        source={{ uri }}
        style={[styles.image, checkered && styles.checkered]}
        contentFit="contain"
      />
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 16, fontWeight: '600' },
  result: { gap: 8, padding: 12, backgroundColor: '#F4F6FA', borderRadius: 12 },
  label: { color: '#666', fontSize: 13 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  preview: { alignItems: 'center', gap: 4 },
  image: { width: 120, height: 120, borderRadius: 8, backgroundColor: '#fff' },
  checkered: { backgroundColor: '#FADBD8' },
  caption: { fontSize: 12, color: '#666' },
  swatch: { width: 28, height: 28, borderRadius: 14 },
  mono: { fontFamily: 'Menlo', fontSize: 11 },
});
