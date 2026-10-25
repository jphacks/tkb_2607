// ズーム・パンのジェスチャーと、画面全体・惑星にかける変形(アニメーションするスタイル)をまとめるフック。
// 2本指でつまむと拡大・縮小(指の真ん中を中心に)、1本指でなぞると移動する。
// 惑星の論理的な配置は変えず、ここで作る transform だけで見た目を変える。
// 惑星を並べた層(画面と同じ大きさ)をまるごと拡大すると、iOS がその大きな層を粗い解像度で描くため、
// 惑星・名前・輪がぼやける。そこで層は拡大せず、惑星ごとに位置と大きさだけを変える(usePlanetCameraStyle)。
import { useCallback } from 'react';
import {
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
} from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import {
  anchorUnderFocal,
  clampTranslate,
  clampZoom,
  planetZoomScale,
  translateKeepingFocal,
} from './viewport';

export function useViewport() {
  const zoom = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  /** 表示領域の大きさ(onLayout で入れる)。拡大の中心と移動の上限に使う */
  const viewportWidth = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  /** 全員の惑星が丸ごと見える拡大率(縮小の下限に使う) */
  const fitZoom = useSharedValue(1);

  // つまみ始めたときの拡大率と、指の下にあった変形前の点
  const startZoom = useSharedValue(1);
  const anchorX = useSharedValue(0);
  const anchorY = useSharedValue(0);

  const pinch = usePinchGesture({
    onActivate: (e) => {
      'worklet';
      startZoom.value = zoom.value;
      anchorX.value = anchorUnderFocal(
        e.focalX,
        viewportWidth.value / 2,
        translateX.value,
        zoom.value,
      );
      anchorY.value = anchorUnderFocal(
        e.focalY,
        viewportHeight.value / 2,
        translateY.value,
        zoom.value,
      );
    },
    onUpdate: (e) => {
      'worklet';
      const nextZoom = clampZoom(startZoom.value * e.scale, fitZoom.value);
      zoom.value = nextZoom;
      // 指の下の点が動かないように移動量を合わせる(2本指のまま動かすと、そのぶん移動もする)
      translateX.value = clampTranslate(
        translateKeepingFocal(e.focalX, viewportWidth.value / 2, anchorX.value, nextZoom),
        nextZoom,
        viewportWidth.value,
      );
      translateY.value = clampTranslate(
        translateKeepingFocal(e.focalY, viewportHeight.value / 2, anchorY.value, nextZoom),
        nextZoom,
        viewportHeight.value,
      );
    },
  });

  const pan = usePanGesture({
    maxPointers: 1,
    onUpdate: (e) => {
      'worklet';
      translateX.value = clampTranslate(
        translateX.value + e.changeX,
        zoom.value,
        viewportWidth.value,
      );
      translateY.value = clampTranslate(
        translateY.value + e.changeY,
        zoom.value,
        viewportHeight.value,
      );
    },
  });

  const gesture = useSimultaneousGestures(pinch, pan);

  // shared value は React の決まり(描画中に値を書き換えない)に合わせて .set() / .get() で読み書きする。
  // 画面側の useEffect の依存に入るので、描き直しのたびに作り直さない(useCallback)。
  // 作り直すと「関数が変わった」と判断され、値が同じでも毎回呼び直される
  const setViewportSize = useCallback(
    (width: number, height: number) => {
      viewportWidth.set(width);
      viewportHeight.set(height);
    },
    [viewportWidth, viewportHeight],
  );

  const setFitZoom = useCallback(
    (value: number) => {
      fitZoom.set(value);
      // 縮小の下限が上がったとき(見切れていた惑星が内側に来たなど)、今の拡大率が下限より小さければ下限まで戻す。
      // 戻さないと、次につまむまで縮小しすぎた状態が残り、つまんだ瞬間に急に跳ぶ
      const current = zoom.get();
      const allowed = clampZoom(current, value);
      if (allowed !== current) zoom.set(withTiming(allowed));
    },
    [fitZoom, zoom],
  );

  return {
    gesture,
    zoom,
    translateX,
    translateY,
    setViewportSize,
    setFitZoom,
  };
}

export type Viewport = ReturnType<typeof useViewport>;

/**
 * 惑星1つにかける変形。等倍のときの中心 (centerX, centerY) の惑星を、画面全体を
 * 「画面の中心 (originX, originY) を基準に zoom 倍 → translate だけ移動」したときと同じ位置に動かし、
 * 大きさは planetZoomScale の範囲で変える。惑星ごとに呼ぶ。
 * 画面の中心は、軌道の点線の層(SpaceCameraLayer)と同じく描く領域の大きさから渡す
 * (onLayout で入る viewportWidth / viewportHeight だと、レイアウト前は 0 で惑星だけずれる)
 */
export function usePlanetCameraStyle(
  viewport: Pick<Viewport, 'zoom' | 'translateX' | 'translateY'>,
  centerX: number,
  centerY: number,
  originX: number,
  originY: number,
) {
  const { zoom, translateX, translateY } = viewport;
  return useAnimatedStyle(() => {
    const z = zoom.value;
    return {
      transform: [
        { translateX: translateX.value + (z - 1) * (centerX - originX) },
        { translateY: translateY.value + (z - 1) * (centerY - originY) },
        { scale: planetZoomScale(z) },
      ],
    };
  });
}
