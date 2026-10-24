// 写真の加工(画面なしで呼べる処理)。
// 惑星は写真から色を取り出し、水彩で描く。衛星は Vision で被写体を切り抜き、できなければ写真の中央を円形に切り抜く。
import {
  ClipOp,
  ImageFormat,
  Skia,
  type SkCanvas,
  type SkImage,
  type SkPaint,
} from '@shopify/react-native-skia';
import {
  ImageManipulator,
  SaveFormat,
  type ActionCrop,
  type ImageRef,
} from 'expo-image-manipulator';

import type { CutoutSubject, GeneratePlanet } from './contract';
import { savePngToCache } from './files';
import { extractPlanetPalette } from './palette';
import { newPlanetSeed, renderPlanetPng } from './planet-art';
import { DEFAULT_PLANET_STYLE_ID } from './planet-styles';
import { decidePlanetTraits } from './planet-traits';
import { cutoutWithVision } from './vision';

const MAX_SIZE = 512;

/** トリミング画面で作る衛星の1辺(px) */
export const CUTOUT_SIZE = 512;

/** トリミング画面で拡大できる上限の倍率 */
export const MAX_ZOOM = 5;

/** トリミング画面で使う写真の、短い辺の上限(px) */
const CROP_MAX_SHORT_SIDE = CUTOUT_SIZE * MAX_ZOOM;

/** 元の写真のピクセルで表した、切り取る範囲 */
export type CropRegion = ActionCrop['crop'];

/** エラーを、ログや画面に出せる文字にする */
export function describeError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

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

/**
 * 画像を読み込み、1辺が getSize で決まる透明な正方形のキャンバスに draw で描いて、
 * PNG をキャッシュに `cutout-<時刻>-<番号>.png` で保存する
 */
async function renderSquarePng(
  uri: string,
  getSize: (width: number, height: number) => number,
  draw: (canvas: SkCanvas, image: SkImage, size: number, paint: SkPaint) => void,
): Promise<string> {
  // Skia の画像やキャンバスは JS のゴミ集め(GC)では解放されにくいので、使い終わったら dispose() する
  const disposables: { dispose(): void }[] = [];
  try {
    const data = await Skia.Data.fromURI(uri);
    disposables.push(data);
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) throw new Error('画像を読み込めませんでした');
    disposables.push(image);

    const size = getSize(image.width(), image.height());
    const surface = Skia.Surface.Make(size, size);
    if (!surface) throw new Error('切り抜き用のキャンバスを作れませんでした');
    disposables.push(surface);
    const paint = Skia.Paint();
    disposables.push(paint);

    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color('transparent'));
    draw(canvas, image, size, paint);
    surface.flush();

    const snapshot = surface.makeImageSnapshot();
    disposables.push(snapshot);
    return await savePngToCache('cutout', snapshot.encodeToBytes(ImageFormat.PNG));
  } finally {
    disposables.reverse().forEach((item) => item.dispose());
  }
}

/** 写真の中央を円形に切り抜き、円の外を透明にした PNG を作る */
function cropCircleToPng(uri: string): Promise<string> {
  return renderSquarePng(uri, Math.min, (canvas, image, size, paint) => {
    const square = Skia.XYWHRect(0, 0, size, size);
    const center = Skia.XYWHRect(
      (image.width() - size) / 2,
      (image.height() - size) / 2,
      size,
      size,
    );
    canvas.clipRRect(Skia.RRectXY(square, size / 2, size / 2), ClipOp.Intersect, true);
    canvas.drawImageRect(image, center, square, paint);
  });
}

/** 画像を、長い辺を1辺とする透明な正方形の真ん中に置いた PNG を作る(拡大はしない) */
function padToSquarePng(uri: string): Promise<string> {
  return renderSquarePng(uri, Math.max, (canvas, image, size, paint) => {
    // 半端な位置に置くとにじむので、ピクセルの境目にそろえる
    const x = Math.floor((size - image.width()) / 2);
    const y = Math.floor((size - image.height()) / 2);
    canvas.drawImage(image, x, y, paint);
  });
}

// 画面なしで呼ぶ用(デモ用ダミーの作成にも使う)。
// 写真から色を取り出し、写真の雰囲気で種類と形を決めて、水彩で惑星を1つ描く
export const generatePlanet: GeneratePlanet = async (photoUri) => {
  const palette = await extractPlanetPalette(photoUri);
  const traits = decidePlanetTraits(palette);
  const imageUri = await renderPlanetPng(palette, traits, DEFAULT_PLANET_STYLE_ID, newPlanetSeed());
  return { imageUri, palette };
};

/** 縮小した画像を Vision で切り抜き、透明な正方形の真ん中に置く。切り抜けなければエラーを投げる */
async function visionToSquarePng(resizedUri: string): Promise<string> {
  const imageUri = await padToSquarePng(await cutoutWithVision(resizedUri));
  if (__DEV__) console.log('[photo] 衛星を Vision で切り抜いた');
  return imageUri;
}

/** 写真を縮小して Vision で切り抜く。円形には戻さず、切り抜けなければエラーを投げる */
export async function cutoutSubjectWithVision(photoUri: string): Promise<string> {
  // Vision には必ず縮小後の画像を渡す(大きい画像だとライブラリの中でアプリごと落ちることがある)
  return visionToSquarePng(await resizeToPng(photoUri));
}

// 画面なしで呼ぶ用。縮小 → Vision で切り抜いて正方形に収める → どこかで失敗したら中央を円形に切り抜く
export const cutoutSubject: CutoutSubject = async (photoUri) => {
  // Vision には必ず縮小後の画像を渡す(大きい画像だとライブラリの中でアプリごと落ちることがある)
  const resized = await resizeToPng(photoUri);
  try {
    return { imageUri: await visionToSquarePng(resized) };
  } catch (e) {
    if (__DEV__) console.log(`[photo] 衛星を円形で切り抜いた(理由:${describeError(e)})`);
    return { imageUri: await cropCircleToPng(resized) };
  }
};

/**
 * トリミング画面で使う写真を読み込む。画面の表示と切り取りの計算を、同じ画像
 * (向きを直したあとの幅・高さ)でそろえるため。使い終わったら release() する。
 * 大きな写真はメモリを大きく使うので、短い辺を CROP_MAX_SHORT_SIDE px までに縮める。
 * 拡大の上限(MAX_ZOOM 倍)でも切り取る範囲が CUTOUT_SIZE px を下回らない大きさなので、仕上がりは変わらない
 */
export async function loadPhotoForCrop(photoUri: string): Promise<ImageRef> {
  const refs: { release(): void }[] = [];
  try {
    const loading = ImageManipulator.manipulate(photoUri);
    refs.push(loading);
    const original = await loading.renderAsync();
    if (Math.min(original.width, original.height) <= CROP_MAX_SHORT_SIDE) return original;
    // 縮めたら、元の大きさの画像はすぐ解放する
    refs.push(original);
    const size =
      original.width <= original.height
        ? { width: CROP_MAX_SHORT_SIDE }
        : { height: CROP_MAX_SHORT_SIDE };
    const resizing = ImageManipulator.manipulate(original).resize(size);
    refs.push(resizing);
    return await resizing.renderAsync();
  } finally {
    refs.reverse().forEach((ref) => ref.release());
  }
}

/** 写真の region を切り取り、CUTOUT_SIZE×CUTOUT_SIZE の円形・背景が透明な PNG を作る */
export async function cropRegionToCirclePng(photo: ImageRef, region: CropRegion): Promise<string> {
  const refs: { release(): void }[] = [];
  try {
    const cropping = ImageManipulator.manipulate(photo)
      .crop(region)
      .resize({ width: CUTOUT_SIZE, height: CUTOUT_SIZE });
    refs.push(cropping);
    const square = await cropping.renderAsync();
    refs.push(square);
    const saved = await square.saveAsync({ format: SaveFormat.PNG });
    return await cropCircleToPng(saved.uri);
  } finally {
    refs.reverse().forEach((ref) => ref.release());
  }
}
