// 宇宙背景の「軌道の点線」と「星の飾り」を、惑星と同じカメラ(ズーム・パン)で描く層。
// 地図アプリで土地と建物が一緒に動くのと同じく、背景と惑星が一体になって動くようにする。
// - 軌道の点線:惑星と同じ倍率で、位置も大きさも変わる(地図の道路のような扱い)
// - 星の飾り:位置だけ動き、大きさは変えない(地図のピンのような扱い)
// 置き場所・画像・線の見た目は土台の space-decorations.ts / space-assets.ts をそのまま使う
// (土台の SpaceDecorLayer はズームしない版。描き方はそれに合わせている)。
// カメラの値は Reanimated の値のまま Skia に渡すので、指の動きのたびに React で描き直さない。
import {
  Canvas,
  DashPathEffect,
  Group,
  Image as SkiaImage,
  Oval,
  type SkImage,
} from '@shopify/react-native-skia';
import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { useSpaceAssets } from '@/components/space-assets';
import {
  fitB01,
  ORBIT_STYLE,
  ORBITS,
  SPACE_DECORATIONS,
  type SpaceDecoration,
} from '@/components/space-decorations';

/** ズーム・パンの状態(use-viewport.ts)。画面の中心を基準に zoom 倍してから translate だけ動かす */
export type Camera = {
  zoom: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
};

type Props = Camera & {
  /** 描く領域(GravityView と同じ大きさ) */
  width: number;
  height: number;
};

export const SpaceCameraLayer = memo(function SpaceCameraLayer({
  zoom,
  translateX,
  translateY,
  width,
  height,
}: Props) {
  const { scale, offsetX, offsetY } = fitB01(width, height);
  const cx = width / 2;
  const cy = height / 2;
  // 画像は起動中に読み込み済み(space-assets.ts)。まだなら星はまとめて後から出す
  const images = useSpaceAssets()?.decorations;

  // B01 の座標 → 等倍の画面の座標(背景画像と同じ倍率) → カメラ(中心基準の拡大と移動)
  const worldTransform = useDerivedValue(() => [
    { translateX: cx + translateX.value },
    { translateY: cy + translateY.value },
    { scale: zoom.value },
    { translateX: offsetX - cx },
    { translateY: offsetY - cy },
    { scale },
  ]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group transform={worldTransform}>
        {ORBITS.map((o, i) => (
          <Oval
            key={i}
            x={o.cx - o.width / 2}
            y={o.cy - o.height / 2}
            width={o.width}
            height={o.height}
            style="stroke"
            strokeWidth={ORBIT_STYLE.strokeWidth * o.scale}
            color={ORBIT_STYLE.color}
            opacity={ORBIT_STYLE.opacity * o.opacity}
          >
            <DashPathEffect intervals={ORBIT_STYLE.dash.map((d) => d * o.scale)} />
          </Oval>
        ))}
      </Group>
      {images &&
        SPACE_DECORATIONS.map((d, i) => (
          <CameraStar
            key={i}
            decoration={d}
            image={images[d.kind]}
            zoom={zoom}
            translateX={translateX}
            translateY={translateY}
            center={{ x: cx, y: cy }}
            fit={{ scale, offsetX, offsetY }}
          />
        ))}
    </Canvas>
  );
});

/** 星1つ。位置はカメラに合わせて動かし、大きさは等倍のときのまま */
function CameraStar({
  decoration: d,
  image,
  zoom,
  translateX,
  translateY,
  center,
  fit,
}: Camera & {
  decoration: SpaceDecoration;
  image: SkImage;
  center: { x: number; y: number };
  fit: { scale: number; offsetX: number; offsetY: number };
}) {
  const w = d.width * fit.scale;
  const h = d.height * fit.scale;
  // 等倍のときの画面上の中心
  const baseX = fit.offsetX + d.x * fit.scale;
  const baseY = fit.offsetY + d.y * fit.scale;

  const transform = useDerivedValue(() => [
    { translateX: center.x + translateX.value + zoom.value * (baseX - center.x) },
    { translateY: center.y + translateY.value + zoom.value * (baseY - center.y) },
  ]);

  return (
    <Group transform={transform}>
      <SkiaImage image={image} x={-w / 2} y={-h / 2} width={w} height={h} fit="contain" />
    </Group>
  );
}
