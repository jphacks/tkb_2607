// 引力の描画。スコア計算(scoring.ts)・半径マッピング(radius.ts)・角度の決定(angular-layout.ts)は切り出し済み。
// ここは座標変換と描画のみを担当する。惑星1つぶんの見た目は土台の PlanetNode を使う。
// 位置はデザイン上の座標(home-layout.ts の DESIGN_FRAME)で計算し、背景画像と同じ倍率で画面の座標に直す。
// そのため、画面の大きさが変わっても半径・角度(論理的な配置)は変わらない。
// ズーム・パンは、その上から画面全体にかける変形(use-viewport.ts)だけで行い、配置の計算には触れない。
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { type SharedValue } from 'react-native-reanimated';

import { PlanetNode } from '@/components/planet-node';
import type { UserId } from '@/types/domain';

import type { GravityViewProps } from './contract';
import { GRAVITY_CONFIG, type AngularMode } from './config';
import { DESIGN_FRAME, fitDesign, ME_SLOT } from './home-layout';
import { calculateMaxRadius, mapStrengthToRadius } from './radius';
import { calculateStrengths } from './scoring';
import { SpaceCameraLayer } from './space-camera-layer';
import { useFrozenAngles } from './use-frozen-angles';
import { usePlanetCounterScaleStyle, useViewport } from './use-viewport';
import { fitZoomFor } from './viewport';

const PLANET_SIZE = GRAVITY_CONFIG.layout.planetSize;
/** 自分の惑星(ME_SLOT)から、デザインの画面の端までに収まる最大半径 */
const MAX_RADIUS = calculateMaxRadius(ME_SLOT, DESIGN_FRAME);

/** 惑星1つぶんの箱。画面全体を拡大しても、惑星の見た目の大きさは上限・下限の範囲にとどめる */
function ZoomCompensated({ zoom, children }: { zoom: SharedValue<number>; children: ReactNode }) {
  const style = usePlanetCounterScaleStyle(zoom);
  return <Animated.View style={style}>{children}</Animated.View>;
}

type Props = GravityViewProps & {
  /** 角度の決め方。練習場で見比べるためのもの(契約外)。省略時は config.ts の値 */
  angularMode?: AngularMode;
};

export function GravityView({
  me,
  candidates,
  onPressPlanet,
  angles: savedAngles,
  onAnglesComputed,
  angularMode,
}: Props) {
  // 最初は画面サイズで仮に置き、実際の表示領域(ヘッダーがある画面では少し低い)が分かったら置き直す
  const windowSize = useWindowDimensions();
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const { width, height } = area ?? windowSize;
  const { scale, offsetX, offsetY } = fitDesign(width, height);
  const viewport = useViewport();

  // 顔ぶれは週1回選んだときの関係の強さの順に並んでいるので、先頭から出す(週の途中で出る人が変わらない)
  const visible = candidates.slice(0, GRAVITY_CONFIG.maxVisiblePlanets);
  const strengths = calculateStrengths(me, visible);
  const radii = new Map(
    visible.map((c) => [c.userId, mapStrengthToRadius(strengths.get(c.userId) ?? 0, MAX_RADIUS)]),
  );

  // 角度は週に1回だけ決める。保存済み(savedAngles)があればそれを使い、
  // なければ(null)ここで計算して onAnglesComputed で土台に渡す。練習場など undefined のときはその場で計算する
  const needsCompute = !savedAngles || visible.some((c) => !savedAngles.has(c.userId));
  const computedAngles = useFrozenAngles(radii, angularMode, needsCompute);

  const reported = useRef<ReadonlyMap<UserId, number> | null>(null);
  useEffect(() => {
    if (savedAngles !== null || !onAnglesComputed) return;
    if (reported.current === computedAngles) return;
    reported.current = computedAngles;
    onAnglesComputed(computedAngles);
  }, [savedAngles, computedAngles, onAnglesComputed]);

  /** デザイン上の中心座標と直径を、画面上の箱(左上と直径)に直す */
  const toScreen = (x: number, y: number, designSize: number) => {
    const size = designSize * scale;
    return { size, left: offsetX + x * scale - size / 2, top: offsetY + y * scale - size / 2 };
  };

  const mePos = toScreen(ME_SLOT.x, ME_SLOT.y, ME_SLOT.size);
  const placed = visible.map((c) => {
    const r = radii.get(c.userId) ?? MAX_RADIUS;
    // 保存済みの角度にいない人(念のため)は、その場で計算した角度を使う
    const angle = savedAngles?.get(c.userId) ?? computedAngles.get(c.userId) ?? 0;
    return {
      candidate: c,
      ...toScreen(ME_SLOT.x + r * Math.cos(angle), ME_SLOT.y + r * Math.sin(angle), PLANET_SIZE),
    };
  });

  // 端で見切れている惑星があれば、全員が丸ごと見えるところまで縮小できるようにする
  const fitZoom = fitZoomFor(
    [mePos, ...placed].map(({ left, top, size }) => ({
      centerX: left + size / 2,
      centerY: top + size / 2,
      size,
    })),
    width,
    height,
  );
  const { setFitZoom } = viewport;
  useEffect(() => setFitZoom(fitZoom), [fitZoom, setFitZoom]);

  return (
    <GestureDetector gesture={viewport.gesture}>
      <View
        style={styles.space}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          setArea({ width: w, height: h });
          viewport.setViewportSize(w, h);
        }}
      >
        {/* 軌道の点線と星の飾り。惑星と同じカメラで動く(背景のグラデーションは画面側で、動かない) */}
        <SpaceCameraLayer
          zoom={viewport.zoom}
          translateX={viewport.translateX}
          translateY={viewport.translateY}
          width={width}
          height={height}
        />
        <Animated.View style={[StyleSheet.absoluteFill, viewport.contentStyle]}>
          {placed.map(({ candidate: c, size, left, top }) => {
            return (
              <Pressable
                key={c.userId}
                onPress={() => onPressPlanet(c.userId)}
                style={[styles.planet, { left, top }]}
              >
                <ZoomCompensated zoom={viewport.zoom}>
                  <PlanetNode
                    planet={c.planet}
                    size={size}
                    label={c.nickname}
                    showLabel={c.encounterCount >= GRAVITY_CONFIG.labelMinEncounters}
                  />
                </ZoomCompensated>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => onPressPlanet(me.userId)}
            style={[styles.planet, { left: mePos.left, top: mePos.top }]}
          >
            <ZoomCompensated zoom={viewport.zoom}>
              <PlanetNode
                planet={me.planet}
                size={mePos.size}
                label="You"
                isMe
                satellites={me.featuredSatellites}
              />
            </ZoomCompensated>
          </Pressable>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

// 背景(宇宙)はホーム画面側で描くので、ここは透明にする
const styles = StyleSheet.create({
  space: { flex: 1, overflow: 'hidden' },
  planet: { position: 'absolute' },
});
