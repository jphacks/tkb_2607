// 惑星と、その周りの点線の軌道を回る衛星。横にスワイプすると衛星が軌道に沿って回る。
// Figma: B02|惑星の選択(大)、C01|衛星登録・惑星の位置編集・A06|効果音登録(中)
//
// 軌道は惑星を中心にした円を斜めから見たもの(画面では楕円)。円の手前の半分は惑星より前、
// 奥の半分は惑星の後ろを通る。手前と奥の境目は楕円の長軸の両端(惑星の外側)になる。
import { Canvas, DashPathEffect, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import type { Planet, SatelliteSummary } from '@/types/domain';

import { PlanetBody } from './planet-node';

type Size = 'lg' | 'md';

/** Figma の寸法(画面幅 393 のとき) */
const GEOMETRY: Record<
  Size,
  {
    planet: number;
    orbitW: number;
    orbitH: number;
    tilt: number;
    satellite: number;
    height: number;
  }
> = {
  // B02:惑星 212、軌道 449 × 148 を -9.17° 傾ける
  lg: { planet: 212, orbitW: 449, orbitH: 148, tilt: -9.17, satellite: 92, height: 300 },
  // C01・A06:惑星 158、軌道 349 × 163
  md: { planet: 158, orbitW: 349, orbitH: 163, tilt: 0, satellite: 74, height: 220 },
};

/** 1つ目の衛星が止まる角度。手前の右下(Figma の配置) */
const FRONT_ANGLE = Math.PI / 3;
/** 指を離したあと、衛星が止まる位置へ向かう動き */
const SETTLE_SPRING = { mass: 1, stiffness: 70, damping: 15 };
/** 点線の点の間隔(px) */
const DOT_GAP = 5.1;

/** 画面上の軌道。中心 (cx, cy)、半径 a × b の楕円を tilt だけ傾けたもの */
type Orbit = { cx: number; cy: number; a: number; b: number; tilt: number };

/** 軌道上の角度 t の点。sin(t) > 0 が手前の半分 */
function orbitPoint(o: Orbit, t: number) {
  'worklet';
  const ex = o.a * Math.cos(t);
  const ey = o.b * Math.sin(t);
  return {
    x: o.cx + ex * Math.cos(o.tilt) - ey * Math.sin(o.tilt),
    y: o.cy + ex * Math.sin(o.tilt) + ey * Math.cos(o.tilt),
  };
}

/**
 * 指の動き (dx, dy) を、軌道を回る角度の変化に直す。theta は指でつかんでいる点の角度。
 * つかんだ点が軌道に沿って指についてくるように回す。
 */
function orbitDelta(o: Orbit, dx: number, dy: number, theta: number) {
  'worklet';
  // 軌道の傾きを戻す
  const ux = dx * Math.cos(o.tilt) + dy * Math.sin(o.tilt);
  const uy = -dx * Math.sin(o.tilt) + dy * Math.cos(o.tilt);
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  // 軌道の接線の向きに動いたぶんだけ回す
  const tx = -o.a * s;
  const ty = o.b * c;
  const along = (ux * tx + uy * ty) / (tx * tx + ty * ty);
  // 左右の端では軌道が縦向きなので、横の動きが接線に乗らない。残った横の動きで、
  // 端の衛星を惑星の中心の側へ(手前の衛星なら手前を、奥の衛星なら奥を通って)回す。
  // 端より外へ引く動きでは回さない(手前と奥を行き来して、惑星の前後にちらつくのを防ぐ)
  const outward = (ux - along * tx) * c > 0;
  const restX = outward ? 0 : ux - along * tx;
  const across = (-restX * (s >= 0 ? 1 : -1) * c * c) / (o.a * Math.max(Math.abs(s), 0.45));
  return along + across;
}

/** 軌道の t0 から t1 までの道のりを、点線の点がちょうど等間隔に並ぶ間隔とともに返す */
function orbitArc(o: Orbit, t0: number, t1: number): { path: SkPath; gap: number } {
  const builder = Skia.PathBuilder.Make();
  const steps = 96;
  let length = 0;
  let prev = orbitPoint(o, t0);
  builder.moveTo(prev.x, prev.y);
  for (let i = 1; i <= steps; i++) {
    const p = orbitPoint(o, t0 + ((t1 - t0) * i) / steps);
    builder.lineTo(p.x, p.y);
    length += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  // 半周の長さが点の間隔で割り切れるようにして、手前と奥のつなぎ目でも点の間隔をそろえる
  return { path: builder.build(), gap: length / Math.max(1, Math.round(length / DOT_GAP)) };
}

type Props = {
  planet: Planet | null;
  satellites: SatelliteSummary[];
  size?: Size;
  /** 横のスワイプで衛星を回せるようにする */
  swipeable?: boolean;
  onPressPlanet?: () => void;
};

export function PlanetOrbit({
  planet,
  satellites,
  size = 'md',
  swipeable = false,
  onPressPlanet,
}: Props) {
  const g = GEOMETRY[size];
  const [width, setWidth] = useState(393);
  // 画面幅に合わせて全体を縮める(大きくはしない)
  const k = Math.min(1, width / 393);
  const orbit: Orbit = useMemo(
    () => ({
      cx: width / 2,
      cy: (g.height * k) / 2,
      a: (g.orbitW * k) / 2,
      b: (g.orbitH * k) / 2,
      tilt: (g.tilt * Math.PI) / 180,
    }),
    [width, k, g],
  );
  const planetSize = g.planet * k;
  /** 惑星本体の倍率(PlanetBody が planetSize に掛けて描く) */
  const planetScale = planet?.sizeScale ?? 1;
  const satelliteSize = g.satellite * k;

  // 手前の半分は sin(t) > 0(0〜π)、奥の半分は π〜2π
  const front = useMemo(() => orbitArc(orbit, 0, Math.PI), [orbit]);
  const back = useMemo(() => orbitArc(orbit, Math.PI, 2 * Math.PI), [orbit]);

  // 衛星は等間隔に並べ、1つ目を手前の右下に置く
  const count = satellites.length;
  const step = (2 * Math.PI) / Math.max(1, count);
  const baseAngles = satellites.map((_, i) => FRONT_ANGLE + i * step);

  const rotation = useSharedValue(0);
  /** 指でつかんだ衛星の角度(rotation を足す前)。衛星以外をつかんだときは NaN */
  const grabbed = useSharedValue(NaN);
  const last = useSharedValue({ x: 0, y: 0 });
  const dragging = useSharedValue(false);

  /** いまつかんでいる点の軌道上の角度。衛星以外をつかんだときは、いちばん手前の点を回す */
  const grabbedAngle = () => {
    'worklet';
    const base = grabbed.get();
    return Number.isNaN(base) ? Math.PI / 2 : base + rotation.get();
  };

  /** 指を離したあと、勢いのぶん回ってから、どれかの衛星が手前の右下に来る位置で止まる */
  const settle = (velocity: number) => {
    'worklet';
    const v = Math.max(-15, Math.min(15, velocity));
    const target = Math.round((rotation.get() + v * 0.3) / step) * step;
    rotation.set(withSpring(target, { ...SETTLE_SPRING, velocity: v }));
  };

  // 衛星の数が変わると並ぶ間隔も変わるので、どれかの衛星が手前の右下に来る位置へ寄せ直す
  useEffect(() => {
    rotation.set(withSpring(Math.round(rotation.get() / step) * step, SETTLE_SPRING));
  }, [rotation, step]);

  const pan = usePanGesture({
    enabled: swipeable,
    activeOffsetX: [-10, 10],
    // 先に縦に 10px 動いたらスクロールとみなし、衛星は回さない
    failOffsetY: [-10, 10],
    onTouchesDown: (e) => {
      // 回っている途中なら、触れたところで止める
      cancelAnimation(rotation);
      const touch = e.allTouches[0];
      if (!touch) return;
      // 指の下にある衛星を探す。重なっていたら手前のものを選ぶ。惑星に隠れた奥の衛星は選ばない
      let pick = NaN;
      let pickDepth = -2;
      const onPlanet =
        Math.hypot(touch.x - orbit.cx, touch.y - orbit.cy) < (planetSize * planetScale) / 2;
      for (const base of baseAngles) {
        const t = base + rotation.get();
        const depth = Math.sin(t);
        if (depth < 0 && onPlanet) continue;
        const p = orbitPoint(orbit, t);
        // 端の衛星は画面からはみ出して小さくしか見えないので、触れる範囲を少し広めにとる
        const radius = ((satelliteSize * (0.78 + (0.22 * (depth + 1)) / 2)) / 2) * 1.25;
        if (Math.hypot(touch.x - p.x, touch.y - p.y) < radius && depth > pickDepth) {
          pick = base;
          pickDepth = depth;
        }
      }
      grabbed.set(pick);
    },
    onActivate: (e) => {
      dragging.set(true);
      last.set({ x: e.x, y: e.y });
    },
    onUpdate: (e) => {
      // 指が動いたぶんだけ、つかんだ点が軌道に沿って指についてくるように回す
      const prev = last.get();
      const theta = grabbedAngle();
      rotation.set(rotation.get() + orbitDelta(orbit, e.x - prev.x, e.y - prev.y, theta));
      last.set({ x: e.x, y: e.y });
    },
    onDeactivate: (e) => {
      settle(orbitDelta(orbit, e.velocityX, e.velocityY, grabbedAngle()));
    },
    onFinalize: () => {
      // タップだけで終わったとき(回っている途中で止めた場合)も、衛星の位置をそろえる
      if (!dragging.get()) settle(0);
      dragging.set(false);
    },
  });

  return (
    <GestureDetector gesture={pan}>
      <View style={{ height: g.height * k }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {/* 重なり順:軌道の奥 → 奥の衛星 → 惑星 → 軌道の手前 → 手前の衛星 */}
        <OrbitLine arc={back} zIndex={0} />
        {satellites.map((s, i) => (
          <OrbitingSatellite
            key={s.id}
            satellite={s}
            baseAngle={baseAngles[i]}
            rotation={rotation}
            orbit={orbit}
            size={satelliteSize}
          />
        ))}
        <Pressable
          onPress={onPressPlanet}
          disabled={!onPressPlanet}
          style={[
            styles.planet,
            { left: orbit.cx - planetSize / 2, top: orbit.cy - planetSize / 2 },
          ]}
        >
          <PlanetBody planet={planet} size={planetSize} />
        </Pressable>
        <OrbitLine arc={front} zIndex={3} />
      </View>
    </GestureDetector>
  );
}

function OrbitLine({ arc, zIndex }: { arc: { path: SkPath; gap: number }; zIndex: number }) {
  return (
    <Canvas style={[StyleSheet.absoluteFill, { zIndex }]} pointerEvents="none">
      <Path
        path={arc.path}
        style="stroke"
        strokeWidth={2.4}
        strokeCap="round"
        color="rgba(255, 255, 255, 0.85)"
      >
        <DashPathEffect intervals={[0.1, arc.gap - 0.1]} />
      </Path>
    </Canvas>
  );
}

function OrbitingSatellite({
  satellite,
  baseAngle,
  rotation,
  orbit,
  size,
}: {
  satellite: SatelliteSummary;
  baseAngle: number;
  rotation: SharedValue<number>;
  orbit: Orbit;
  size: number;
}) {
  const style = useAnimatedStyle(() => {
    const t = baseAngle + rotation.get();
    const { x, y } = orbitPoint(orbit, t);
    // 手前の半分は惑星と軌道の手前より前、奥の半分は惑星の後ろ。奥ほど少し小さく
    const depth = (Math.sin(t) + 1) / 2;
    const scale = 0.78 + 0.22 * depth;
    return {
      zIndex: Math.sin(t) > 0 ? 4 : 1,
      transform: [{ translateX: x - size / 2 }, { translateY: y - size / 2 }, { scale }],
    };
  });

  return (
    <Animated.View
      style={[styles.satellite, { width: size, height: size }, style]}
      pointerEvents="none"
    >
      <Image
        source={{ uri: satellite.imageUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  planet: { position: 'absolute', zIndex: 2 },
  satellite: { position: 'absolute', left: 0, top: 0 },
});
