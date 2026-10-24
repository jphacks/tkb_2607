// 惑星と、その周りの点線の軌道を回る衛星。横にスワイプすると衛星が軌道に沿って回る。
// Figma: B02|惑星の選択(大)、C01|衛星登録・惑星の位置編集・A06|効果音登録(中)
import { Canvas, DashPathEffect, Group, Oval, vec } from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
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
  const cx = width / 2;
  const cy = (g.height * k) / 2;
  const a = (g.orbitW * k) / 2;
  const b = (g.orbitH * k) / 2;
  const tilt = (g.tilt * Math.PI) / 180;

  const rotation = useSharedValue(0);
  const start = useSharedValue(0);
  const pan = usePanGesture({
    enabled: swipeable,
    activeOffsetX: [-10, 10],
    onActivate: () => {
      start.set(rotation.get());
    },
    onUpdate: (e) => {
      // 指を動かした距離のぶん、軌道に沿って回す
      rotation.set(start.get() - e.translationX / a);
    },
  });

  return (
    <GestureDetector gesture={pan}>
      <View style={{ height: g.height * k }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Group transform={[{ rotate: tilt }]} origin={vec(cx, cy)}>
            <Oval
              x={cx - a}
              y={cy - b}
              width={a * 2}
              height={b * 2}
              style="stroke"
              strokeWidth={2.4}
              strokeCap="round"
              color="rgba(255, 255, 255, 0.85)"
            >
              <DashPathEffect intervals={[0.1, 5]} />
            </Oval>
          </Group>
        </Canvas>
        {satellites.map((s, i) => (
          <OrbitingSatellite
            key={s.id}
            satellite={s}
            // 1つ目が手前(右下)に来るよう、角度を 60° ずらして等間隔に並べる
            baseAngle={Math.PI / 3 + (i * 2 * Math.PI) / satellites.length}
            rotation={rotation}
            center={{ x: cx, y: cy }}
            radii={{ a, b }}
            tilt={tilt}
            size={g.satellite * k}
          />
        ))}
        <Pressable
          onPress={onPressPlanet}
          disabled={!onPressPlanet}
          style={[styles.planet, { left: cx - (g.planet * k) / 2, top: cy - (g.planet * k) / 2 }]}
        >
          <PlanetBody planet={planet} size={g.planet * k} />
        </Pressable>
      </View>
    </GestureDetector>
  );
}

function OrbitingSatellite({
  satellite,
  baseAngle,
  rotation,
  center,
  radii,
  tilt,
  size,
}: {
  satellite: SatelliteSummary;
  baseAngle: number;
  rotation: SharedValue<number>;
  center: { x: number; y: number };
  radii: { a: number; b: number };
  tilt: number;
  size: number;
}) {
  const style = useAnimatedStyle(() => {
    const t = baseAngle + rotation.get();
    const ex = radii.a * Math.cos(t);
    const ey = radii.b * Math.sin(t);
    const x = center.x + ex * Math.cos(tilt) - ey * Math.sin(tilt);
    const y = center.y + ex * Math.sin(tilt) + ey * Math.cos(tilt);
    // 軌道の下半分は惑星より手前、上半分は奥。奥ほど少し小さく
    const depth = (Math.sin(t) + 1) / 2;
    const scale = 0.78 + 0.22 * depth;
    return {
      zIndex: Math.sin(t) > 0 ? 3 : 1,
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
