// 惑星の画像を描く。画面には出さずに Skia のキャンバスに描き、背景が透明な PNG にする。
// 重ねる順:輪の奥側 → 本体 → 輪の手前側 → 衛星
import {
  BlendMode,
  ClipOp,
  FillType,
  ImageFormat,
  Skia,
  TileMode,
  type SkCanvas,
  type SkImage,
  type SkPath,
} from '@shopify/react-native-skia';

import { darken, varyColor } from './colors';
import { savePngToCache } from './files';
import {
  between,
  blobPath,
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

/** 本体の半径(キャンバスに対する割合)。輪や衛星がはみ出して切れないよう、小さめにして余白を残す */
const BODY_RADIUS = 0.35;

/** 本体の直径が、惑星の画像の1辺に対してどれだけか。表示する側は、本体を size にしたいなら画像を size / この値 で描く */
export const PLANET_BODY_RATIO = BODY_RADIUS * 2;

/** 輪の形(本体の半径に対する割合)。輪が切れないよう、外側の端がキャンバスに収まる大きさにしてある */
const RING = {
  inner: 1.16,
  outer: 1.38,
  /** 縦のつぶれ具合(横の半径に対する縦の半径) */
  flatten: 0.3,
  /** 傾き(度) */
  tilt: -16,
};

/** 衛星の大きさと置き場所(本体の半径に対する割合)。輪とぶつかりにくい、右上と左下に置く */
const MOON = {
  radius: [0.1, 0.15],
  distance: 1.2,
  angles: [-70, 120],
};

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

/** 輪を、別のキャンバスに1回だけ描いて画像にする(奥側と手前側で模様がずれないように) */
function renderRing(
  track: Track,
  style: PlanetStyle,
  palette: string[],
  seed: number,
  cx: number,
  cy: number,
  r: number,
): SkImage {
  return offscreen(track, PLANET_SIZE, (canvas) => {
    const brush = style.createBrush(canvas, PLANET_SIZE, palette, seed + 101, track);
    const random = createRandom(seed + 102);
    const ellipse = (scale: number) =>
      Skia.XYWHRect(
        cx - r * scale,
        cy - r * scale * RING.flatten,
        r * scale * 2,
        r * scale * 2 * RING.flatten,
      );
    const band = (from: number, to: number) =>
      track(
        Skia.PathBuilder.Make()
          .addOval(ellipse(to))
          .addOval(ellipse(from))
          .setFillType(FillType.EvenOdd)
          .build(),
      );

    canvas.save();
    canvas.rotate(RING.tilt, cx, cy);
    const ring = band(RING.inner, RING.outer);
    clipped(canvas, ring, () => {
      brush.ground(ring);
      brush.fill(ring, varyColor(palette[1 % palette.length], random, 0.1));
      // 内側に、色の違う細い輪を重ねる
      const middle = (RING.inner + RING.outer) / 2;
      brush.fill(band(RING.inner, middle), varyColor(palette[2 % palette.length], random, 0.1), {
        alpha: 0.7,
      });
      brush.texture(ring);
      shadeShape(canvas, track, style, brush, ring, cx, cy, r * RING.outer);
    });
    canvas.restore();
  });
}

/** 輪の画像の、奥側(half = 'back')か手前側('front')だけを貼る */
function drawRingHalf(
  canvas: SkCanvas,
  ring: SkImage,
  half: 'back' | 'front',
  cx: number,
  cy: number,
) {
  canvas.save();
  // 輪と同じだけ傾けて、輪の中心を通る線で上下に分ける
  canvas.rotate(RING.tilt, cx, cy);
  const big = PLANET_SIZE * 2;
  canvas.clipRect(
    half === 'back'
      ? Skia.XYWHRect(cx - big, cy - big, big * 2, big)
      : Skia.XYWHRect(cx - big, cy, big * 2, big),
    ClipOp.Intersect,
    true,
  );
  canvas.rotate(-RING.tilt, cx, cy);
  canvas.drawImage(ring, 0, 0);
  canvas.restore();
}

/** palette の色・traits の種類と形・styleId の画風で惑星を描き、PNG をキャッシュに保存して URI を返す */
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
    const ring = traits.rings ? renderRing(track, style, palette, seed, cx, cy, r) : null;

    const image = offscreen(track, PLANET_SIZE, (canvas) => {
      const brush = style.createBrush(canvas, PLANET_SIZE, palette, seed, track);
      const random = createRandom(seed);

      if (ring) drawRingHalf(canvas, ring, 'back', cx, cy);

      // 本体。別の層に描き、ふちの外を消してから重ねる
      const body = track(circlePath(cx, cy, r, style.edgeWobble, createRandom(seed + 1)));
      const soft = style.edgeSoftness;
      // ふちをぼかす画風は少し外側まで塗っておき、あとでふちの外を少しずつ消す
      const paintArea =
        soft > 0 ? track(circlePath(cx, cy, r * (1 + style.edgeWobble) + soft * 3)) : body;
      canvas.saveLayer();
      clipped(canvas, paintArea, () => {
        const context = { brush, palette, cx, cy, radius: r, random, track };
        brush.ground(paintArea);
        // 土台の塗り:テクスチャを使う画風はテクスチャ、それ以外は種類ごとの塗り
        if (texture) drawTexturedBody(canvas, track, texture, palette, cx, cy, r, random);
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

      if (ring) drawRingHalf(canvas, ring, 'front', cx, cy);

      // 衛星
      for (let i = 0; i < traits.moons; i++) {
        const angle = ((MOON.angles[i] + between(random, -15, 15)) * Math.PI) / 180;
        const mr = r * between(random, MOON.radius[0], MOON.radius[1]);
        const mx = cx + Math.cos(angle) * r * MOON.distance;
        const my = cy + Math.sin(angle) * r * MOON.distance;
        const moon = track(circlePath(mx, my, mr, style.edgeWobble, random));
        const color = varyColor(palette[(i + 1) % palette.length], random, 0.15);
        clipped(canvas, moon, () => {
          brush.ground(moon);
          brush.fill(moon, color);
          brush.fill(
            track(blobPath(mx + mr * 0.2, my + mr * 0.1, mr * 0.4, 0.3, random)),
            darken(color, 0.2),
            { alpha: 0.6 },
          );
          brush.texture(moon);
          shadeShape(canvas, track, style, brush, moon, mx, my, mr);
        });
        brush.outline?.(moon);
      }
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
 * 1つの色の一覧と種類・形から、画風の違う候補を1つずつ作る(並び順は PLANET_STYLES と同じ)。
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
