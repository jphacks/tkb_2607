// ホームに並ぶ惑星1つぶんの見た目(惑星・名前ラベル・輪と衛星)。
// 置く場所は決めない。呼び出し側が size × size の箱として配置する(ラベル・輪・衛星ははみ出して描く)。
// Figma: Home フレームの「Watercolor planet surface」「User label」
import { Canvas, Group, Oval, rect, Shadow } from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { PLANET_BODY_RATIO } from '@/features/photo';
import { color, gradient, radius, shadow, space, typography } from '@/theme/tokens';
import type { Planet, SatelliteSummary } from '@/types/domain';

type Props = {
  planet: Planet | null;
  /** 惑星の直径(px) */
  size: number;
  label: string;
  /** false なら名前ラベルを出さない(遠い惑星・見切れる惑星) */
  showLabel?: boolean;
  /** 自分の惑星なら、ラベルを大きくする */
  isMe?: boolean;
  /** 惑星の周りに出す衛星(最大3つ)。あれば輪も描く */
  satellites?: SatelliteSummary[];
  /**
   * 何倍の細かさで描くか(1 以上)。ズームで拡大して見せる所では、拡大したときの最大の倍率を渡す。
   * 中身を resolution 倍の大きさで描いてから縮めて size × size に収めるので、拡大してもぼやけない
   * (等倍で描いたものを拡大すると、画像・文字・輪が引き伸ばされてぼやける)
   */
  resolution?: number;
};

export function PlanetNode({
  planet,
  size,
  label,
  showLabel = true,
  isMe = false,
  satellites = [],
  resolution = 1,
}: Props) {
  const r = Math.max(1, resolution);
  /** 実際に描く大きさ。中の長さはすべてこれを基準にする */
  const drawSize = size * r;
  const showRing = satellites.length > 0;
  // 惑星本体は持ち主が決めた倍率で描く(輪・衛星は size のまま)。
  // ラベルは、小さくしたときは本体の下端に寄せ、大きくしたときは標準の位置のまま
  // (ホームの配置はラベルが標準の位置にある前提で画面に収めているので、下にずらすとはみ出す)
  const labelAnchor = Math.min(drawSize, drawSize * (planet?.sizeScale ?? 1));
  const labelType = isMe ? typography.labelSmall : typography.labelPlanet;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: (size - drawSize) / 2,
          top: (size - drawSize) / 2,
          width: drawSize,
          height: drawSize,
          transform: [{ scale: 1 / r }],
        }}
      >
        {/* 輪は衛星の軌道。衛星がないときは出さない。奥の半分は惑星の後ろ、手前の半分は前に描く */}
        {showRing && <PlanetRing size={drawSize} half="back" />}
        <PlanetBody planet={planet} size={drawSize} />
        {showRing && <PlanetRing size={drawSize} half="front" />}
        {showRing && <OrbitingSatellites satellites={satellites} size={drawSize} />}
        {showLabel && (
          <View
            style={[
              styles.labelSlot,
              {
                top: (drawSize + labelAnchor) / 2 + (isMe ? space.sm : space.xs) * r,
                left: LABEL_OVERFLOW * r,
                right: LABEL_OVERFLOW * r,
              },
            ]}
            pointerEvents="none"
          >
            <View
              style={[
                styles.label,
                { paddingHorizontal: LABEL_PADDING.x * r, paddingVertical: LABEL_PADDING.y * r },
              ]}
            >
              <Text style={[styles.labelText, labelType, { fontSize: labelType.fontSize * r }]}>
                {label}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const LABEL_PADDING = { x: 7, y: 3 };
/** ラベルは惑星より幅が広いことがあるので、左右にこの分(負の値)はみ出せる枠の中で中央ぞろえにする */
const LABEL_OVERFLOW = -100;

/**
 * 惑星本体。size × size の箱の中央に、直径 size × planet.sizeScale で描く
 * (箱の大きさは変わらないので、呼び出し側の配置はそのまま。大きくしたぶんは箱からはみ出す)
 */
export function PlanetBody({ planet, size }: { planet: Planet | null; size: number }) {
  const bodySize = size * (planet?.sizeScale ?? 1);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <PlanetSurface planet={planet} size={bodySize} />
    </View>
  );
}

/** 惑星本体を、倍率(planet.sizeScale)を掛けずに直径 size で描く。倍率を自分で扱う呼び出し側・標準の大きさで出したい所で使う */
export function PlanetSurface({ planet, size }: { planet: Planet | null; size: number }) {
  const circle = { width: size, height: size, borderRadius: size / 2 };
  if (planet?.imageUrl) {
    // 写真担当の惑星の画像は背景が透明で、輪や衛星が本体の外にはみ出す。丸く切らずに、
    // 本体の直径が size になる大きさで中央に置く(陰影は画像に描き込み済み)
    const imageSize = size / PLANET_BODY_RATIO;
    const offset = (size - imageSize) / 2;
    return (
      <View style={{ width: size, height: size }}>
        <View style={[StyleSheet.absoluteFill, circle, { boxShadow: shadow.planet(size) }]} />
        <Image
          source={{ uri: planet.imageUrl }}
          contentFit="contain"
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: imageSize,
            height: imageSize,
            left: offset,
            top: offset,
          }}
        />
      </View>
    );
  }
  return (
    <View style={[circle, { boxShadow: shadow.planet(size) }]}>
      <View style={[circle, { backgroundColor: planet?.palette[0] ?? color.bg.accentMuted }]} />
      <View style={[StyleSheet.absoluteFill, circle, gradient.planetShading]} />
    </View>
  );
}

// 惑星の輪。94px の惑星で 147 × 30px の楕円、右上がりに 22.52° 傾く。
// 線の太さ・影も惑星の直径に対する割合にして、大きく描いても(resolution)見た目の比率を変えない
const RING = { width: 1.565, height: 0.319, offsetX: -0.053, offsetY: 0.066, angle: '-22.52deg' };
/** 94px の惑星で、線の太さ 1.5px・影のずれ 4px・ぼかし 2px・影がはみ出す分 8px */
const RING_STROKE = 1.5 / 94;
const RING_SHADOW = { dy: 4 / 94, blur: 2 / 94 };
const RING_PADDING = 8 / 94;

/** half:back は輪の奥の半分(上側)、front は手前の半分(下側)だけを描く */
function PlanetRing({ size, half }: { size: number; half: 'back' | 'front' }) {
  const w = size * RING.width;
  const h = size * RING.height;
  const padding = size * RING_PADDING;
  const canvasW = w + padding * 2;
  const canvasH = h + padding * 2;
  const clip =
    half === 'back' ? rect(0, 0, canvasW, canvasH / 2) : rect(0, canvasH / 2, canvasW, canvasH / 2);
  return (
    <Canvas
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: canvasW,
        height: canvasH,
        left: size / 2 + size * RING.offsetX - w / 2 - padding,
        top: size / 2 + size * RING.offsetY - h / 2 - padding,
        transform: [{ rotate: RING.angle }],
      }}
    >
      <Group clip={clip}>
        <Oval
          x={padding}
          y={padding}
          width={w}
          height={h}
          style="stroke"
          strokeWidth={size * RING_STROKE}
          color={color.decor.planetRing}
        >
          <Shadow
            dx={0}
            dy={size * RING_SHADOW.dy}
            blur={size * RING_SHADOW.blur}
            color="rgba(0, 0, 0, 0.15)"
          />
        </Oval>
      </Group>
    </Canvas>
  );
}

// 衛星を置く3か所:輪の右端・中央(手前)・左端。惑星の中心からのずれと箱の大きさは、惑星の直径に対する割合。
// Figma「B01｜宇宙ホーム」の自分の惑星(猫・フラペチーノ・スーツケース)の位置を写したもの。
// 衛星の画像は縦横比がばらばらなので、箱は Figma の画像と同じ面積の正方形にして、中に収める
const SATELLITE_SLOTS = [
  { x: 0.515, y: -0.356, size: 0.453 }, // 右端
  { x: 0.363, y: 0.123, size: 0.462 }, // 中央
  { x: -0.733, y: 0.417, size: 0.538 }, // 左端
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
    const w = size * slot.size;
    const h = w;
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
        }}
      />
    );
  });
}

const styles = StyleSheet.create({
  labelSlot: { position: 'absolute', alignItems: 'center' },
  label: { backgroundColor: color.bg.surface, borderRadius: radius.full },
  labelText: { color: color.text.label },
});
