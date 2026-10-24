// 宇宙背景の「軌道の点線」と「星の飾り」を、ズームしていない状態(B01 と同じ倍率)で描く。
// SpaceBackground(グラデーション)の上、惑星の下に重ねる。
// ズーム・パンするときは、ORBITS は惑星と同じ倍率で、SPACE_DECORATIONS は位置だけ動かして大きさは変えずに描く。
import {
  Canvas,
  DashPathEffect,
  Group,
  Image as SkiaImage,
  Oval,
  useImage,
} from '@shopify/react-native-skia';
import { memo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import {
  DECORATION_IMAGES,
  fitB01,
  ORBIT_STYLE,
  ORBITS,
  SPACE_DECORATIONS,
} from './space-decorations';

// 描く内容は画面の大きさだけで決まるので、親(ホーム)がデータの更新で描き直されても描き直さない
export const SpaceDecorLayer = memo(function SpaceDecorLayer() {
  // 最初は画面サイズで仮に描き、実際の表示領域が分かったら描き直す(GravityView と同じ)
  const windowSize = useWindowDimensions();
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const { width, height } = area ?? windowSize;
  const { scale, offsetX, offsetY } = fitB01(width, height);

  const images = {
    sparkle: useImage(DECORATION_IMAGES.sparkle),
    metal: useImage(DECORATION_IMAGES.metal),
    glass: useImage(DECORATION_IMAGES.glass),
    checker: useImage(DECORATION_IMAGES.checker),
  };

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(e) =>
        setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
      }
    >
      <Canvas style={styles.canvas}>
        <Group transform={[{ translateX: offsetX }, { translateY: offsetY }, { scale }]}>
          {ORBITS.map((o, i) => (
            <Oval
              key={i}
              x={o.cx - o.width / 2}
              y={o.cy - o.height / 2}
              width={o.width}
              height={o.height}
              style="stroke"
              strokeWidth={ORBIT_STYLE.strokeWidth}
              color={ORBIT_STYLE.color}
              opacity={ORBIT_STYLE.opacity}
            >
              <DashPathEffect intervals={ORBIT_STYLE.dash} />
            </Oval>
          ))}
        </Group>
        {SPACE_DECORATIONS.map((d, i) => {
          const image = images[d.kind];
          if (!image) return null;
          const w = d.width * scale;
          const h = d.height * scale;
          return (
            <SkiaImage
              key={i}
              image={image}
              x={offsetX + d.x * scale - w / 2}
              y={offsetY + d.y * scale - h / 2}
              width={w}
              height={h}
              fit="contain"
            />
          );
        })}
      </Canvas>
    </View>
  );
});

const styles = StyleSheet.create({
  canvas: { flex: 1 },
});
