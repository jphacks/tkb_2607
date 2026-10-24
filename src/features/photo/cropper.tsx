// 被写体を切り抜けなかったときに出す、円形のトリミング画面。
// 2本指で拡大・縮小、1本指で移動して、丸い枠の中を 512×512 の円形の PNG にする。
import { Canvas, Circle, FillType, Path, Skia } from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import type { ImageRef } from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import {
  CUTOUT_SIZE,
  cropRegionToCirclePng,
  describeError,
  loadPhotoForCrop,
  type CropRegion,
} from './processing';

/** 丸い枠と画面の端のすき間(pt) */
const FRAME_MARGIN = 24;
/** 拡大できる上限の倍率 */
const MAX_ZOOM = 5;

type Size = { width: number; height: number };

/** 写真を画面にどう置くか(拡大率 1 倍のとき) */
type Geometry = {
  /** 丸い枠の直径(pt) */
  diameter: number;
  /** 拡大率 1 倍のときの写真の表示サイズ(pt)。短い辺が枠の直径とぴったり同じ */
  displayWidth: number;
  displayHeight: number;
  /** 拡大率の上限。切り取る範囲が元の写真で CUTOUT_SIZE px を下回らない倍率と MAX_ZOOM の小さい方 */
  maxScale: number;
};

function getGeometry(photo: ImageRef, area: Size): Geometry {
  const diameter = Math.min(area.width, area.height) - FRAME_MARGIN * 2;
  const shortSide = Math.min(photo.width, photo.height);
  const fit = diameter / shortSide;
  return {
    diameter,
    displayWidth: photo.width * fit,
    displayHeight: photo.height * fit,
    maxScale: Math.max(1, Math.min(MAX_ZOOM, shortSide / CUTOUT_SIZE)),
  };
}

/** 写真の端が枠の内側に入らないように、ずらす量を押し戻す */
function clampOffset(offset: number, displayed: number, diameter: number): number {
  'worklet';
  const limit = Math.max(0, (displayed - diameter) / 2);
  return Math.min(limit, Math.max(-limit, offset));
}

/** 画面上の丸い枠を、元の写真のピクセル範囲に計算し直す */
function toPhotoRegion(
  photo: ImageRef,
  geometry: Geometry,
  scale: number,
  offsetX: number,
  offsetY: number,
): CropRegion {
  // 画面の 1pt が、元の写真の何 px にあたるか
  const pixelsPerPoint = photo.width / (geometry.displayWidth * scale);
  const size = Math.floor(Math.min(geometry.diameter * pixelsPerPoint, photo.width, photo.height));
  // 写真は枠の中心から (offsetX, offsetY) だけずれているので、枠の中心は写真の中心から逆向きにずれる
  const centerX = photo.width / 2 - offsetX * pixelsPerPoint;
  const centerY = photo.height / 2 - offsetY * pixelsPerPoint;
  const clamp = (value: number, max: number) => Math.min(max, Math.max(0, Math.round(value)));
  return {
    originX: clamp(centerX - size / 2, photo.width - size),
    originY: clamp(centerY - size / 2, photo.height - size),
    width: size,
    height: size,
  };
}

type Transform = {
  scale: SharedValue<number>;
  offsetX: SharedValue<number>;
  offsetY: SharedValue<number>;
};

type CropStageProps = Transform & {
  photo: ImageRef;
  area: Size;
  geometry: Geometry;
};

/** 写真と丸い枠を表示し、指の操作で写真を動かす部分 */
function CropStage({ photo, area, geometry, scale, offsetX, offsetY }: CropStageProps) {
  const { diameter, displayWidth, displayHeight, maxScale } = geometry;
  const centerX = area.width / 2;
  const centerY = area.height / 2;

  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const pinchStartScale = useSharedValue(1);
  const pinchStartX = useSharedValue(0);
  const pinchStartY = useSharedValue(0);
  const pinchStartFocalX = useSharedValue(0);
  const pinchStartFocalY = useSharedValue(0);

  const pan = usePanGesture({
    onActivate: () => {
      panStartX.set(offsetX.get());
      panStartY.set(offsetY.get());
    },
    onUpdate: (e) => {
      if (e.numberOfPointers > 1) {
        // 2本指の間はピンチに任せる。1本指に戻ったときに写真が飛ばないよう、基準だけ合わせておく
        panStartX.set(offsetX.get() - e.translationX);
        panStartY.set(offsetY.get() - e.translationY);
        return;
      }
      const s = scale.get();
      offsetX.set(clampOffset(panStartX.get() + e.translationX, displayWidth * s, diameter));
      offsetY.set(clampOffset(panStartY.get() + e.translationY, displayHeight * s, diameter));
    },
  });

  const pinch = usePinchGesture({
    onActivate: (e) => {
      pinchStartScale.set(scale.get());
      pinchStartX.set(offsetX.get());
      pinchStartY.set(offsetY.get());
      pinchStartFocalX.set(e.focalX - centerX);
      pinchStartFocalY.set(e.focalY - centerY);
    },
    onUpdate: (e) => {
      const s = Math.min(maxScale, Math.max(1, pinchStartScale.get() * e.scale));
      const ratio = s / pinchStartScale.get();
      // ピンチを始めたとき2本の指の中心にあった写真の場所が、今の指の中心に来るようにずらす
      const focalX = e.focalX - centerX;
      const focalY = e.focalY - centerY;
      const x = focalX - (pinchStartFocalX.get() - pinchStartX.get()) * ratio;
      const y = focalY - (pinchStartFocalY.get() - pinchStartY.get()) * ratio;
      scale.set(s);
      offsetX.set(clampOffset(x, displayWidth * s, diameter));
      offsetY.set(clampOffset(y, displayHeight * s, diameter));
    },
  });

  const gesture = useSimultaneousGestures(pan, pinch);

  const photoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.get() },
      { translateY: offsetY.get() },
      { scale: scale.get() },
    ],
  }));

  // 画面全体から丸い枠を抜いた形。ここを半透明の黒で塗って、枠の外を暗くする
  const shade = Skia.PathBuilder.Make()
    .addRect(Skia.XYWHRect(0, 0, area.width, area.height))
    .addCircle(centerX, centerY, diameter / 2)
    .setFillType(FillType.EvenOdd)
    .build();

  return (
    <GestureDetector gesture={gesture}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: centerX - displayWidth / 2,
              top: centerY - displayHeight / 2,
              width: displayWidth,
              height: displayHeight,
            },
            photoStyle,
          ]}
        >
          <Image source={photo} style={StyleSheet.absoluteFill} contentFit="fill" />
        </Animated.View>
        <Canvas style={[StyleSheet.absoluteFill, styles.passThrough]}>
          <Path path={shade} color="rgba(0, 0, 0, 0.5)" />
          <Circle
            cx={centerX}
            cy={centerY}
            r={diameter / 2}
            color="white"
            style="stroke"
            strokeWidth={2}
          />
        </Canvas>
      </View>
    </GestureDetector>
  );
}

export type CircleCropperProps = {
  /** 切り取る元の写真 */
  photoUri: string;
  /** 画面の上に出す一言の案内 */
  message: string;
  /** 「キャンセル」を押したとき */
  onCancel: () => void;
  /** 「決定」で円形の PNG ができたら呼ぶ */
  onConfirm: (imageUri: string) => Promise<void>;
};

export function CircleCropper({ photoUri, message, onCancel, onConfirm }: CircleCropperProps) {
  const [photo, setPhoto] = useState<ImageRef | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [area, setArea] = useState<Size | null>(null);
  const [busy, setBusy] = useState(false);

  const scale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  // 元の大きさの写真はメモリを大きく使うので、画面を閉じたら release() する
  useEffect(() => {
    let cancelled = false;
    let loaded: ImageRef | null = null;
    loadPhotoForCrop(photoUri)
      .then((ref) => {
        if (cancelled) {
          ref.release();
          return;
        }
        loaded = ref;
        setPhoto(ref);
      })
      .catch((e) => {
        if (__DEV__)
          console.log(`[photo] トリミング用の写真を読み込めなかった(${describeError(e)})`);
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
      loaded?.release();
    };
  }, [photoUri]);

  const geometry = photo && area ? getGeometry(photo, area) : null;

  const confirm = async () => {
    if (!photo || !geometry) return;
    setBusy(true);
    try {
      const region = toPhotoRegion(photo, geometry, scale.get(), offsetX.get(), offsetY.get());
      await onConfirm(await cropRegionToCirclePng(photo, region));
    } catch (e) {
      Alert.alert('衛星を作れませんでした', describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <Text style={styles.message}>{message}</Text>
      <View
        style={styles.stage}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setArea({ width, height });
        }}
      >
        {photo && area && geometry ? (
          <CropStage
            photo={photo}
            area={area}
            geometry={geometry}
            scale={scale}
            offsetX={offsetX}
            offsetY={offsetY}
          />
        ) : loadFailed ? (
          <Text style={styles.message}>写真を読み込めませんでした</Text>
        ) : (
          <ActivityIndicator color="white" />
        )}
      </View>
      <View style={styles.buttons}>
        {busy ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Button title="キャンセル" onPress={onCancel} />
            <Button title="決定" onPress={confirm} disabled={!geometry} />
          </>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'black', paddingVertical: 48 },
  message: { color: 'white', textAlign: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  stage: { flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  buttons: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16 },
  passThrough: { pointerEvents: 'none' },
});
