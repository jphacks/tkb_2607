// 画風を描くときに使う共通の部品。
import {
  BlendMode,
  BlurStyle,
  PaintStyle,
  Skia,
  StrokeCap,
  TileMode,
  type SkCanvas,
  type SkPaint,
  type SkPath,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';

type Disposable = { dispose(): void };
export type Track = <T extends Disposable>(item: T) => T;

/**
 * draw の中で作った Skia の部品(ペン・パス・効果)を、描き終わったらまとめて dispose() する。
 * Skia の部品は JS のゴミ集め(GC)では解放されにくいため
 */
export function withDisposables(draw: (track: Track) => void): void {
  const items: Disposable[] = [];
  try {
    draw((item) => {
      items.push(item);
      return item;
    });
  } finally {
    items.reverse().forEach((item) => item.dispose());
  }
}

/** 同じ seed なら同じ並びになる乱数(0 以上 1 未満を返す関数) */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 惑星の半径。ふちのがたつきやぼかしがはみ出さないよう、キャンバスより少し小さくする */
export function planetRadius(size: number): number {
  return size * 0.47;
}

/** 惑星の中のどこか1点(spread = 1 で惑星いっぱい、小さいほど中心に寄る) */
export function randomPointInPlanet(random: () => number, size: number, spread = 1) {
  const angle = random() * Math.PI * 2;
  const distance = Math.sqrt(random()) * planetRadius(size) * spread;
  return { x: size / 2 + Math.cos(angle) * distance, y: size / 2 + Math.sin(angle) * distance };
}

/** 上から下への位置 t(0〜1)に合わせて、帯のように色を選ぶ。少しゆらがせる */
export function bandColor(palette: string[], t: number, random: () => number): string {
  const jittered = Math.min(0.999, Math.max(0, t + (random() - 0.5) * 0.15));
  return palette[Math.floor(jittered * palette.length)];
}

type PaintOptions = {
  color: string;
  /** 不透明度(0〜1) */
  alpha?: number;
  /** 下の色との重ね方 */
  blend?: BlendMode;
  /** 指定すると線になる(線の太さ) */
  stroke?: number;
  /** ぼかしの強さ(px) */
  blur?: number;
};

/** 描くときのペンを作る */
export function makePaint(track: Track, options: PaintOptions): SkPaint {
  const paint = track(Skia.Paint());
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(options.color));
  paint.setAlphaf(options.alpha ?? 1);
  if (options.blend !== undefined) paint.setBlendMode(options.blend);
  if (options.stroke !== undefined) {
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(options.stroke);
    paint.setStrokeCap(StrokeCap.Round);
  }
  if (options.blur) {
    paint.setMaskFilter(track(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, options.blur, false)));
  }
  return paint;
}

/** なめらかな円 */
export function circlePath(size: number): SkPath {
  return Skia.PathBuilder.Make()
    .addCircle(size / 2, size / 2, planetRadius(size))
    .build();
}

/**
 * 中心 (x, y)・半径 r のまわりで、ふちがでこぼこした丸い形。
 * wobble:でこぼこの大きさ(半径に対する割合)、points:でこぼこの数
 */
export function blobPath(
  x: number,
  y: number,
  r: number,
  wobble: number,
  random: () => number,
  points = 12,
): SkPath {
  const corners = Array.from({ length: points }, (_, i) => {
    const angle = (i / points) * Math.PI * 2;
    const radius = r * (1 + (random() * 2 - 1) * wobble);
    return { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius };
  });
  // 角と角のまん中を通る曲線でつなぎ、角ばらない形にする
  const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });
  const start = mid(corners[points - 1], corners[0]);
  const builder = Skia.PathBuilder.Make().moveTo(start.x, start.y);
  corners.forEach((corner, i) => {
    const next = mid(corner, corners[(i + 1) % points]);
    builder.quadTo(corner.x, corner.y, next.x, next.y);
  });
  return builder.close().build();
}

// 粒(紙のざらつき・クレヨンのかすれ・粉っぽさ)を作るシェーダー。
// 細かい粒と大きめの粒を混ぜた値が threshold を超えたところだけ、color の粒を出す
const GRAIN_SKSL = `
uniform float seed;
uniform float grainSize;
uniform float threshold;
uniform float softness;
uniform float3 color;

float hash(float2 cell) {
  return fract(sin(dot(cell + seed, float2(12.9898, 78.233))) * 43758.5453);
}

half4 main(float2 p) {
  float n = 0.65 * hash(floor(p / grainSize)) + 0.35 * hash(floor(p / (grainSize * 4.0)));
  float a = smoothstep(threshold, threshold + softness, n);
  return half4(half3(color) * a, a);
}
`;

let grainEffect: SkRuntimeEffect | null = null;

function getGrainEffect(): SkRuntimeEffect {
  grainEffect ??= Skia.RuntimeEffect.Make(GRAIN_SKSL);
  if (!grainEffect) throw new Error('粒のシェーダーを作れませんでした');
  return grainEffect;
}

type GrainOptions = {
  seed: number;
  /** 粒の大きさ(px) */
  grainSize: number;
  /** 0〜1。大きいほど粒がまばらになる */
  threshold: number;
  /** 0〜1。大きいほど粒のふちがやわらかくなる */
  softness: number;
  color: string;
  alpha: number;
  blend: BlendMode;
};

/** キャンバス全体に粒を重ねる。blend に DstOut を使うと、粒の形に削れる */
export function drawGrain(canvas: SkCanvas, track: Track, size: number, options: GrainOptions) {
  const rgb = Skia.Color(options.color);
  const paint = track(Skia.Paint());
  paint.setShader(
    track(
      getGrainEffect().makeShader([
        options.seed % 1000,
        options.grainSize,
        options.threshold,
        options.softness,
        rgb[0],
        rgb[1],
        rgb[2],
      ]),
    ),
  );
  paint.setAlphaf(options.alpha);
  paint.setBlendMode(options.blend);
  canvas.drawRect(Skia.XYWHRect(0, 0, size, size), paint);
}

/** 片側(右下)を暗くする陰影。光が左上から当たっているように見せる */
export function drawShade(canvas: SkCanvas, size: number) {
  withDisposables((track) => {
    const center = size / 2;
    const paint = track(Skia.Paint());
    paint.setShader(
      track(
        Skia.Shader.MakeRadialGradient(
          Skia.Point(center - size * 0.16, center - size * 0.16),
          size * 0.72,
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
    canvas.drawRect(Skia.XYWHRect(0, 0, size, size), paint);
  });
}
