// 惑星の画像を描く。画面には出さずに Skia のキャンバスに描き、背景が透明な PNG にする。
// 描くのは本体だけ(輪や衛星は描かない。ホームの輪と衛星は土台の部品が描く)
import {
  BlendMode,
  FillType,
  ImageFormat,
  Skia,
  TileMode,
  type SkCanvas,
  type SkImage,
  type SkPath,
} from '@shopify/react-native-skia';

import { savePngToCache } from './files';
import {
  circlePath,
  clipped,
  createRandom,
  makePaint,
  withDisposables,
  type Track,
} from './planet-draw';
import { PLANET_STYLES, getPlanetStyle } from './planet-styles';
import type { PlanetBrush, PlanetStyle } from './planet-styles/types';
import { drawTexturedBody, getPlanetTexture } from './planet-texture';
import type { PlanetTraits } from './planet-traits';
import { getPlanetType } from './planet-types';

/** 惑星の画像の1辺(px) */
export const PLANET_SIZE = 512;

/** 本体の半径(キャンバスに対する割合)。クレヨンのがたつきや水彩のにじみがはみ出さない余白だけ残す */
const BODY_RADIUS = 0.47;

/** 本体の直径が、惑星の画像の1辺に対してどれだけか。表示する側は、本体を size にしたいなら画像を size / この値 で描く */
export const PLANET_BODY_RATIO = BODY_RADIUS * 2;

export type PlanetCandidate = {
  styleId: string;
  /** 画風の名前(水彩・クレヨンなど) */
  label: string;
  imageUri: string;
};

/** 新しい seed(模様の種)を作る */
export function newPlanetSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

/**
 * 片側(右下)を暗くする陰影。光が左上から当たっているように見せる。
 * (cx, cy, r) は陰影をつける丸、strength は濃さ(0〜1)
 */
function drawShade(
  canvas: SkCanvas,
  track: Track,
  cx: number,
  cy: number,
  r: number,
  area: SkPath,
  strength: number,
) {
  const paint = track(Skia.Paint());
  paint.setAlphaf(strength);
  paint.setShader(
    track(
      Skia.Shader.MakeRadialGradient(
        Skia.Point(cx - r * 0.34, cy - r * 0.34),
        r * 1.53,
        [
          Skia.Color('rgba(255, 255, 255, 0.12)'),
          Skia.Color('rgba(0, 0, 0, 0)'),
          Skia.Color('rgba(8, 10, 40, 0.62)'),
        ],
        [0, 0.45, 1],
        TileMode.Clamp,
      ),
    ),
  );
  canvas.drawPath(area, paint);
}

/** 画風に陰影の描き方があればそれで、なければ共通の陰影を重ねる */
function shadeShape(
  canvas: SkCanvas,
  track: Track,
  style: PlanetStyle,
  brush: PlanetBrush,
  area: SkPath,
  cx: number,
  cy: number,
  r: number,
) {
  if (brush.shade) brush.shade(area, cx, cy, r);
  else drawShade(canvas, track, cx, cy, r, area, style.shadeStrength ?? 1);
}

/** キャンバスに描いたものを画像にする */
function offscreen(track: Track, size: number, draw: (canvas: SkCanvas) => void): SkImage {
  const surface = Skia.Surface.Make(size, size);
  if (!surface) throw new Error('惑星を描くキャンバスを作れませんでした');
  track(surface);
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('transparent'));
  draw(canvas);
  surface.flush();
  return track(surface.makeImageSnapshot());
}

/** palette の色・traits の種類・styleId の画風で惑星を描き、PNG をキャッシュに保存して URI を返す */
export async function renderPlanetPng(
  palette: string[],
  traits: PlanetTraits,
  styleId: string,
  seed: number,
): Promise<string> {
  const style = getPlanetStyle(styleId);
  const type = getPlanetType(traits.type);
  const cx = PLANET_SIZE / 2;
  const cy = PLANET_SIZE / 2;
  const r = PLANET_SIZE * BODY_RADIUS;
  // テクスチャは最初の1回だけ読み込み、あとは使い回す(描き始める前に用意しておく)
  const texture = style.usesTexture ? await getPlanetTexture(type.id, seed) : null;

  // Skia の部品は JS のゴミ集め(GC)では解放されにくいので、描き終わったらまとめて dispose() する
  const bytes = withDisposables((track) => {
    const image = offscreen(track, PLANET_SIZE, (canvas) => {
      const brush = style.createBrush(canvas, PLANET_SIZE, palette, seed, track);
      const random = createRandom(seed);

      // 本体。別の層に描き、ふちの外を消してから重ねる
      const body = track(circlePath(cx, cy, r, style.edgeWobble, createRandom(seed + 1)));
      const soft = style.edgeSoftness;
      // 塗る範囲の半径。ふちのがたつきで外に出た所と、ぼかす分(soft × 3)まで含める
      const reach = r * (1 + style.edgeWobble) + soft * 3;
      // ふちをぼかす画風は少し外側まで塗っておき、あとでふちの外を少しずつ消す
      const paintArea = soft > 0 ? track(circlePath(cx, cy, reach)) : body;
      canvas.saveLayer();
      clipped(canvas, paintArea, () => {
        const context = { brush, palette, cx, cy, radius: r, random, track };
        brush.ground(paintArea);
        // 土台の塗り:テクスチャを使う画風はテクスチャ、それ以外は種類ごとの塗り
        if (texture) drawTexturedBody(canvas, track, texture, palette, cx, cy, r, reach, random);
        else type.base(context);
        // 種類ごとの特徴(光る筋・極冠・大陸と雲・クレーターなど)
        type.details(context);
        brush.texture(paintArea);
        shadeShape(canvas, track, style, brush, paintArea, cx, cy, r);
      });
      brush.outline?.(body);
      if (soft > 0) {
        const outside = track(
          Skia.PathBuilder.Make()
            .addRect(Skia.XYWHRect(0, 0, PLANET_SIZE, PLANET_SIZE))
            .addPath(body)
            .setFillType(FillType.EvenOdd)
            .build(),
        );
        canvas.drawPath(
          outside,
          makePaint(track, { color: '#000000', blend: BlendMode.DstOut, blur: soft }),
        );
      }
      canvas.restore();
    });
    return image.encodeToBytes(ImageFormat.PNG);
  });

  return savePngToCache(`planet-${style.id}-${type.id}`, bytes);
}

/** 画面の表示を一度進める(候補を1つ描くたびに、描けたものを見せるため) */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * 1つの色の一覧と種類から、画風の違う候補を1つずつ作る(並び順は PLANET_STYLES と同じ)。
 * onProgress を渡すと、1つ描けるたびに、それまでに描けた候補を渡す
 */
export async function createPlanetCandidates(
  palette: string[],
  traits: PlanetTraits,
  seed: number,
  onProgress?: (candidates: PlanetCandidate[]) => void,
): Promise<PlanetCandidate[]> {
  const startedAt = Date.now();
  const candidates: PlanetCandidate[] = [];
  for (const style of PLANET_STYLES) {
    const imageUri = await renderPlanetPng(palette, traits, style.id, seed);
    candidates.push({ styleId: style.id, label: style.label, imageUri });
    onProgress?.([...candidates]);
    await nextFrame();
  }
  if (__DEV__) {
    console.log(`[photo] 惑星の候補を ${candidates.length} つ作った(${Date.now() - startedAt}ms)`);
  }
  return candidates;
}
