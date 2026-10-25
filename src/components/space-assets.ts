// 宇宙背景の画像(グラデーションと星4種類)を、アプリの起動中に先に読み込んでおく。
// ホームを開いてから読み込むと、紫のグラデーションだけが出て、少し遅れて星が出るため。
// ルートの _layout.tsx でフォントと一緒に読み込みを待つ。
import { Skia, type SkImage } from '@shopify/react-native-skia';
import { Image, type ImageRef } from 'expo-image';
import { useSyncExternalStore } from 'react';
import { Image as RNImage } from 'react-native';

import { DECORATION_IMAGES, type DecorationKind } from './space-decorations';

export const SPACE_GRADIENT = require('@/assets/images/home/space-gradient.png');

export type SpaceAssets = {
  /** グラデーション(expo-image にそのまま渡せる、読み込み済みの画像) */
  gradient: ImageRef;
  /** 星の画像(Skia で描く) */
  decorations: Record<DecorationKind, SkImage>;
};

let loaded: SpaceAssets | null = null;
let loading: Promise<SpaceAssets | null> | null = null;
const listeners = new Set<() => void>();

async function loadSkiaImage(source: number): Promise<SkImage> {
  const uri = RNImage.resolveAssetSource(source)?.uri;
  if (!uri) throw new Error('星の画像が見つかりません');
  const data = await Skia.Data.fromURI(uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error('星の画像を読み込めませんでした');
  return image;
}

/** 読み込みを始める(2回目以降は同じ読み込みを返す)。失敗しても例外は投げず null を返す */
export function preloadSpaceAssets(): Promise<SpaceAssets | null> {
  loading ??= (async () => {
    const kinds = Object.keys(DECORATION_IMAGES) as DecorationKind[];
    const [gradient, ...images] = await Promise.all([
      Image.loadAsync(SPACE_GRADIENT),
      ...kinds.map((k) => loadSkiaImage(DECORATION_IMAGES[k])),
    ]);
    const decorations = Object.fromEntries(kinds.map((k, i) => [k, images[i]])) as Record<
      DecorationKind,
      SkImage
    >;
    loaded = { gradient, decorations };
    listeners.forEach((listener) => listener());
    return loaded;
  })().catch((e) => {
    // 失敗したら、次に使う画面で読み込み直せるようにする(背景の星が出ないだけで、アプリは動く)
    console.warn('[space-assets]', e);
    loading = null;
    return null;
  });
  return loading;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // ルートで読み込みに失敗していたら、ここで読み込み直す
  if (!loaded) preloadSpaceAssets();
  return () => {
    listeners.delete(listener);
  };
}

/** 読み込み済みの背景画像。まだなら null(読み込みが終わると描き直す) */
export function useSpaceAssets(): SpaceAssets | null {
  return useSyncExternalStore(subscribe, () => loaded);
}
