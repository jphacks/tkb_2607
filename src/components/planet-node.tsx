// ホームに並ぶ惑星1つぶんの見た目(惑星・名前ラベル・自分の輪と衛星)。
// 置く場所は決めない。呼び出し側が size × size の箱として配置する(ラベル・輪・衛星ははみ出して描く)。
// Figma: Home フレームの「Watercolor planet surface」「User label」
import { Canvas, Oval, Shadow } from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { color, gradient, radius, shadow, space, typography } from '@/theme/tokens';
import type { Planet, SatelliteSummary } from '@/types/domain';

type Props = {
  planet: Planet | null;
  /** 惑星の直径(px) */
  size: number;
  label: string;
  /** false なら名前ラベルを出さない(遠い惑星・見切れる惑星) */
  showLabel?: boolean;
  /** 自分の惑星なら、輪と衛星を描き、ラベルを大きくする */
  isMe?: boolean;
  /** isMe のときだけ使う。最大3つ */
  satellites?: SatelliteSummary[];
};

export function PlanetNode({
  planet,
  size,
  label,
  showLabel = true,
  isMe = false,
  satellites = [],
}: Props) {
  return (
    <View style={{ width: size, height: size }}>
      <PlanetBody planet={planet} size={size} />
      {isMe && <PlanetRing size={size} />}
      {isMe && <OrbitingSatellites satellites={satellites} size={size} />}
      {showLabel && (
        <View
          style={[styles.labelSlot, { top: size + (isMe ? space.sm : space.xs) }]}
          pointerEvents="none"
        >
          <View style={styles.label}>
            <Text style={[styles.labelText, isMe ? typography.labelSmall : typography.labelPlanet]}>
              {label}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

export function PlanetBody({ planet, size }: { planet: Planet | null; size: number }) {
  const circle = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[circle, { boxShadow: shadow.planet(size) }]}>
      {planet?.imageUrl ? (
        <Image source={{ uri: planet.imageUrl }} style={circle} contentFit="cover" />
      ) : (
        <View style={[circle, { backgroundColor: planet?.palette[0] ?? color.bg.accentMuted }]} />
      )}
      <View style={[StyleSheet.absoluteFill, circle, gradient.planetShading]} />
    </View>
  );
}

// 自分の惑星の輪。94px の惑星で 147 × 30px の楕円、右上がりに 22.52° 傾く
const RING = { width: 1.565, height: 0.319, offsetX: -0.053, offsetY: 0.066, angle: '-22.52deg' };
const RING_PADDING = 8; // 影がはみ出す分

function PlanetRing({ size }: { size: number }) {
  const w = size * RING.width;
  const h = size * RING.height;
  return (
    <Canvas
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: w + RING_PADDING * 2,
        height: h + RING_PADDING * 2,
        left: size / 2 + size * RING.offsetX - w / 2 - RING_PADDING,
        top: size / 2 + size * RING.offsetY - h / 2 - RING_PADDING,
        transform: [{ rotate: RING.angle }],
      }}
    >
      <Oval
        x={RING_PADDING}
        y={RING_PADDING}
        width={w}
        height={h}
        style="stroke"
        strokeWidth={1}
        color={color.border.onImage}
      >
        <Shadow dx={0} dy={4} blur={2} color="rgba(0, 0, 0, 0.25)" />
      </Oval>
    </Canvas>
  );
}

// 衛星を置く3か所(惑星の中心からのずれ・箱の大きさは惑星の直径に対する割合)。Figma の配置を写したもの
const SATELLITE_SLOTS = [
  { x: 0.047, y: -0.495, w: 0.8, h: 0.48, angle: '0deg' },
  { x: 0.405, y: 0.209, w: 0.32, h: 0.47, angle: '11.81deg' },
  { x: -0.36, y: 0.043, w: 0.24, h: 0.45, angle: '-29.26deg' },
];

function OrbitingSatellites({
  satellites,
  size,
}: {
  satellites: SatelliteSummary[];
  size: number;
}) {
  return satellites.slice(0, SATELLITE_SLOTS.length).map((satellite, i) => {
    const slot = SATELLITE_SLOTS[i];
    const w = size * slot.w;
    const h = size * slot.h;
    return (
      <Image
        key={satellite.id}
        source={{ uri: satellite.imageUrl }}
        contentFit="contain"
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: w,
          height: h,
          left: size / 2 + size * slot.x - w / 2,
          top: size / 2 + size * slot.y - h / 2,
          transform: [{ rotate: slot.angle }],
        }}
      />
    );
  });
}

const styles = StyleSheet.create({
  // ラベルは惑星より幅が広いことがあるので、左右にはみ出せる枠の中で中央ぞろえにする
  labelSlot: { position: 'absolute', left: -100, right: -100, alignItems: 'center' },
  label: {
    backgroundColor: color.bg.surface,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  labelText: { color: color.text.label },
});
