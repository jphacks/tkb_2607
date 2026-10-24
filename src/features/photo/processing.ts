// 【仮実装】水彩の惑星生成はまだ。今は「縮小して PNG にする」だけ。
// 衛星の切り抜きは、写真の中央を円形に切り抜く方式(Vision が届いたら被写体の切り抜きに差し替える)。
import { ClipOp, ImageFormat, Skia } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import ImageColors from 'react-native-image-colors';

import type { CutoutSubject, GeneratePlanet } from './contract';

const MAX_SIZE = 512;

/** 同じミリ秒に切り抜いてもファイル名がぶつからないように足す番号 */
let cutoutCount = 0;

/** 長い辺が MAX_SIZE を超えるときだけ縮めて PNG で保存する(小さい写真は拡大しない) */
async function resizeToPng(uri: string): Promise<string> {
  // 元の大きさの写真はネイティブ側のメモリを大きく使うので、使い終わったら release() する
  const refs: { release(): void }[] = [];
  try {
    const loading = ImageManipulator.manipulate(uri);
    refs.push(loading);
    let image = await loading.renderAsync();
    refs.push(image);
    if (Math.max(image.width, image.height) > MAX_SIZE) {
      // 片方だけ指定すると、もう片方は比率を保って自動で決まる
      const size = image.width >= image.height ? { width: MAX_SIZE } : { height: MAX_SIZE };
      const resizing = ImageManipulator.manipulate(image).resize(size);
      refs.push(resizing);
      image = await resizing.renderAsync();
      refs.push(image);
    }
    const result = await image.saveAsync({ format: SaveFormat.PNG });
    return result.uri;
  } finally {
    refs.reverse().forEach((ref) => ref.release());
  }
}

/** 写真の中央を円形に切り抜き、円の外を透明にした PNG をキャッシュに保存する */
async function cropCircleToPng(uri: string): Promise<string> {
  // Skia の画像やキャンバスは JS のゴミ集め(GC)では解放されにくいので、使い終わったら dispose() する
  const disposables: { dispose(): void }[] = [];
  try {
    const data = await Skia.Data.fromURI(uri);
    disposables.push(data);
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) throw new Error('画像を読み込めませんでした');
    disposables.push(image);

    const size = Math.min(image.width(), image.height());
    const surface = Skia.Surface.Make(size, size);
    if (!surface) throw new Error('切り抜き用のキャンバスを作れませんでした');
    disposables.push(surface);
    const paint = Skia.Paint();
    disposables.push(paint);

    const canvas = surface.getCanvas();
    const square = Skia.XYWHRect(0, 0, size, size);
    const center = Skia.XYWHRect(
      (image.width() - size) / 2,
      (image.height() - size) / 2,
      size,
      size,
    );
    canvas.clear(Skia.Color('transparent'));
    canvas.clipRRect(Skia.RRectXY(square, size / 2, size / 2), ClipOp.Intersect, true);
    canvas.drawImageRect(image, center, square, paint);
    surface.flush();

    const snapshot = surface.makeImageSnapshot();
    disposables.push(snapshot);
    const bytes = snapshot.encodeToBytes(ImageFormat.PNG);
    const file = new File(Paths.cache, `cutout-${Date.now()}-${cutoutCount++}.png`);
    file.create();
    await file.write(bytes);
    return file.uri;
  } finally {
    disposables.reverse().forEach((item) => item.dispose());
  }
}

async function extractPalette(uri: string): Promise<string[]> {
  const result = await ImageColors.getColors(uri, { fallback: '#999999' });
  if (result.platform === 'ios') {
    return [result.primary, result.secondary, result.detail, result.background];
  }
  if (result.platform === 'android') {
    return [result.vibrant, result.dominant, result.muted, result.average].filter(
      (c): c is string => !!c,
    );
  }
  return ['#999999'];
}

export const generatePlanet: GeneratePlanet = async (photoUri) => {
  const [imageUri, palette] = await Promise.all([resizeToPng(photoUri), extractPalette(photoUri)]);
  return { imageUri, palette };
};

// Vision の被写体抽出が使えるようになったら、ここで
// 「Vision が使えれば Vision、使えない・被写体がなければ cropCircleToPng」に切り替える
export const cutoutSubject: CutoutSubject = async (photoUri) => {
  const resized = await resizeToPng(photoUri);
  return { imageUri: await cropCircleToPng(resized) };
};
