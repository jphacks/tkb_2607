// ズーム・パンのジェスチャーと、画面全体・惑星にかける変形(アニメーションするスタイル)をまとめるフック。
// 2本指でつまむと拡大・縮小(指の真ん中を中心に)、1本指でなぞると移動する。
// 惑星の論理的な配置は変えず、ここで作る transform だけで見た目を変える。
import {
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
} from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import {
  anchorUnderFocal,
  clampTranslate,
  clampZoom,
  planetCounterScale,
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

  /** 惑星を並べた層全体にかける変形(中心を基準に拡大してから移動) */
  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: zoom.value },
    ],
  }));

  const setViewportSize = (width: number, height: number) => {
    viewportWidth.value = width;
    viewportHeight.value = height;
  };

  const setFitZoom = (value: number) => {
    fitZoom.value = value;
  };

  return { gesture, contentStyle, zoom, translateX, translateY, setViewportSize, setFitZoom };
}

/** 惑星1つにかける逆向きの拡大(見た目の大きさを上限・下限に収める)。惑星ごとに呼ぶ */
export function usePlanetCounterScaleStyle(zoom: SharedValue<number>) {
  return useAnimatedStyle(() => ({
    transform: [{ scale: planetCounterScale(zoom.value) }],
  }));
}
