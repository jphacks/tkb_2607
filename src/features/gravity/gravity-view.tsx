// 引力の描画。スコア計算(scoring.ts)・半径マッピング(radius.ts)・角度の決定(angular-layout.ts)は切り出し済み。
// ここは座標変換と描画のみを担当する。惑星1つぶんの見た目は土台の PlanetNode を使う。
// 位置はデザイン上の座標(home-layout.ts の DESIGN_FRAME)で計算し、背景画像と同じ倍率で画面の座標に直す。
// 距離は、端末で実際に見えている範囲の端までを使うので、縦横比の違う端末では少し変わる
// (縦長の画面では縦の方向ほど遠くまで広がる)。ホームの右上のボタン・左下のピルの場所は避ける。
// 角度の重なりの判定もこの距離で行うので、角度を計算したときの画面の大きさで結果が変わることがある。
// ズーム・パンは、その上から画面全体にかける変形(use-viewport.ts)だけで行い、配置の計算には触れない。
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlanetNode } from '@/components/planet-node';
import type { UserId } from '@/types/domain';

import type { RadiusAt } from './angular-layout';
import type { GravityViewProps } from './contract';
import { GRAVITY_CONFIG, type AngularMode } from './config';
import {
  fitDesign,
  ME_SLOT,
  screenRectToDesign,
  visibleDesignRect,
  type DesignRect,
} from './home-layout';
import { blendStrengthsWithRank, calculateMaxRadiusAt, mapStrengthToRadius } from './radius';
import { calculateStrengths } from './scoring';
import { SpaceCameraLayer } from './space-camera-layer';
import { useFrozenAngles } from './use-frozen-angles';
import { usePlanetCounterScaleStyle, useViewport } from './use-viewport';
import { fitZoomFor } from './viewport';

const PLANET_SIZE = GRAVITY_CONFIG.layout.planetSize;

/** config.ts の avoidAreas(画面の pt)を、width × height の画面のデザイン上の座標に直す */
function avoidDesignRects(width: number, height: number, safeTop: number): DesignRect[] {
  const { topRightButtons: buttons, bottomLeftPill: pill } = GRAVITY_CONFIG.avoidAreas;
  const buttonsTop = safeTop + buttons.top;
  const pillBottom = height - pill.bottom;
  return [
    {
      left: width - buttons.right - buttons.width,
      top: buttonsTop,
      right: width - buttons.right,
      bottom: buttonsTop + buttons.height,
    },
    {
      left: pill.left,
      top: pillBottom - pill.height,
      right: pill.left + pill.width,
      bottom: pillBottom,
    },
  ].map((rect) => screenRectToDesign(rect, width, height));
}

/** 練習場で見比べるための、配置の数値の上書き。省略した値は config.ts の layout の値 */
export type GravityLayoutOverrides = {
  rankBlend?: number;
  visibleMarginFactor?: number;
};

/** 惑星1つぶんの箱。画面全体を拡大しても、惑星の見た目の大きさは上限・下限の範囲にとどめる */
// 押せる範囲(Pressable)ごと縮め戻すので、見た目の大きさと押せる範囲が一致する(拡大しても隣の惑星と取り合わない)
function ZoomCompensated({
  zoom,
  left,
  top,
  children,
}: {
  zoom: SharedValue<number>;
  left: number;
  top: number;
  children: ReactNode;
}) {
  const counterScale = usePlanetCounterScaleStyle(zoom);
  return (
    <Animated.View style={[styles.planet, { left, top }, counterScale]}>{children}</Animated.View>
  );
}

type Props = GravityViewProps & {
  /** 角度の決め方。練習場で見比べるためのもの(契約外)。省略時は config.ts の値 */
  angularMode?: AngularMode;
  /** 配置の数値の上書き。練習場で見比べるためのもの(契約外) */
  layoutOverrides?: GravityLayoutOverrides;
};

export function GravityView({
  me,
  candidates,
  onPressPlanet,
  angles: savedAngles,
  onAnglesComputed,
  angularMode,
  layoutOverrides,
}: Props) {
  // 最初は画面サイズで仮に置き、実際の表示領域(ヘッダーがある画面では少し低い)が分かったら置き直す
  const windowSize = useWindowDimensions();
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const { width, height } = area ?? windowSize;
  const { scale, offsetX, offsetY } = fitDesign(width, height);
  const viewport = useViewport();

  const rankBlend = layoutOverrides?.rankBlend ?? GRAVITY_CONFIG.layout.rankBlend;
  const marginFactor =
    layoutOverrides?.visibleMarginFactor ?? GRAVITY_CONFIG.layout.visibleMarginFactor;
  // 端末で実際に見えている範囲(デザイン上の座標)。縦横比が Figma と違うと、左右か上下が切れる
  const visibleRect = visibleDesignRect(width, height);
  // ホーム画面の右上のボタンと左下のピル(画面の pt をデザイン上の座標に直す)。惑星はここにかからないようにする
  const insets = useSafeAreaInsets();
  const avoid = avoidDesignRects(width, height, insets.top);

  // 顔ぶれは週1回選んだときの関係の強さの順に並んでいるので、先頭から出す(週の途中で出る人が変わらない)
  const visible = candidates.slice(0, GRAVITY_CONFIG.maxVisiblePlanets);
  const strengths = blendStrengthsWithRank(calculateStrengths(me, visible), rankBlend);
  const labeled = new Set(
    visible
      .filter((c) => c.encounterCount >= GRAVITY_CONFIG.labelMinEncounters)
      .map((c) => c.userId),
  );
  /** その方向の最大半径(見えている範囲の端+はみ出しの許容。ボタンやラベルの分は手前)の中で、強さに応じた距離にする */
  const radiusAt: RadiusAt = (userId, angle) =>
    mapStrengthToRadius(
      strengths.get(userId) ?? 0,
      calculateMaxRadiusAt(ME_SLOT, visibleRect, angle, {
        marginFactor,
        avoid,
        labeled: labeled.has(userId),
      }),
    );

  // 角度は週に1回だけ決める。保存済み(savedAngles)があればそれを使い、
  // なければ(null)ここで計算して onAnglesComputed で土台に渡す。練習場など undefined のときはその場で計算する
  const needsCompute = !savedAngles || visible.some((c) => !savedAngles.has(c.userId));
  const computedAngles = useFrozenAngles(
    strengths,
    radiusAt,
    angularMode,
    needsCompute,
    `${rankBlend}:${marginFactor}`,
  );

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
    // 保存済みの角度にいない人(念のため)は、その場で計算した角度を使う
    const angle = savedAngles?.get(c.userId) ?? computedAngles.get(c.userId) ?? 0;
    const r = radiusAt(c.userId, angle);
    return {
      candidate: c,
      ...toScreen(ME_SLOT.x + r * Math.cos(angle), ME_SLOT.y + r * Math.sin(angle), PLANET_SIZE),
    };
  });

  // 端で見切れている惑星があれば、全員が丸ごと見えるところまで縮小できるようにする
  // (惑星本体は持ち主が決めた倍率 planet.sizeScale で描かれるので、その大きさで判定する)
  const fitZoom = fitZoomFor(
    [
      { ...mePos, planet: me.planet },
      ...placed.map((p) => ({ ...p, planet: p.candidate.planet })),
    ].map(({ left, top, size, planet }) => ({
      centerX: left + size / 2,
      centerY: top + size / 2,
      size: size * (planet?.sizeScale ?? 1),
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
              <ZoomCompensated key={c.userId} zoom={viewport.zoom} left={left} top={top}>
                <Pressable onPress={() => onPressPlanet(c.userId)}>
                  <PlanetNode
                    planet={c.planet}
                    size={size}
                    // 本名を見せてよい相手(すれ違い5回以上)なら本名、それ以外はニックネーム
                    label={c.realName ?? c.nickname}
                    showLabel={c.encounterCount >= GRAVITY_CONFIG.labelMinEncounters}
                    satellites={c.featuredSatellites}
                  />
                </Pressable>
              </ZoomCompensated>
            );
          })}
          <ZoomCompensated zoom={viewport.zoom} left={mePos.left} top={mePos.top}>
            <Pressable onPress={() => onPressPlanet(me.userId)}>
              <PlanetNode
                planet={me.planet}
                size={mePos.size}
                label="You"
                isMe
                satellites={me.featuredSatellites}
              />
            </Pressable>
          </ZoomCompensated>
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
