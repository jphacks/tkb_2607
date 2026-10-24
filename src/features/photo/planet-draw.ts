// 惑星を描くときの共通の部品(種類・画風・描く本体のどれからも使う)。
import {
  BlendMode,
  BlurStyle,
  ClipOp,
  PaintStyle,
  Skia,
  StrokeCap,
  type SkCanvas,
  type SkPaint,
  type SkPath,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';

type Disposable = { dispose(): void };
/** 作った Skia の部品を登録しておくと、描き終わったときにまとめて dispose() される */
export type Track = <T extends Disposable>(item: T) => T;

/**
 * draw の中で作った Skia の部品(ペン・パス・効果)を、描き終わったらまとめて dispose() する。
 * Skia の部品は JS のゴミ集め(GC)では解放されにくいため
 */
export function withDisposables<T>(draw: (track: Track) => T): T {
  const items: Disposable[] = [];
  try {
    return draw((item) => {
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

/** min 以上 max 未満の乱数 */
export function between(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

/** 円の中のどこか1点(spread = 1 で円いっぱい、小さいほど中心に寄る) */
export function randomPointInCircle(
  random: () => number,
  cx: number,
  cy: number,
  radius: number,
  spread = 1,
) {
  const angle = random() * Math.PI * 2;
  const distance = Math.sqrt(random()) * radius * spread;
  return { x: cx + Math.cos(angle) * distance, y: cy + Math.sin(angle) * distance };
}

type Point = { x: number; y: number };

/** 点を順につなぐ、角ばらない閉じた形(点と点のまん中を通る曲線でつなぐ) */
function smoothClosedPath(points: Point[]): SkPath {
  const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const start = mid(points[points.length - 1], points[0]);
  const builder = Skia.PathBuilder.Make().moveTo(start.x, start.y);
  points.forEach((point, i) => {
    const next = mid(point, points[(i + 1) % points.length]);
    builder.quadTo(point.x, point.y, next.x, next.y);
  });
  return builder.close().build();
}

/**
 * 中心 (x, y)・半径 r のまわりで、ふちがでこぼこした丸い形。
 * wobble:でこぼこの大きさ(半径に対する割合)、points:でこぼこの数。
 * stretch を 1 より大きくすると横長になる
 */
export function blobPath(
  x: number,
  y: number,
  r: number,
  wobble: number,
  random: () => number,
  points = 12,
  stretch = 1,
): SkPath {
  return smoothClosedPath(
    Array.from({ length: points }, (_, i) => {
      const angle = (i / points) * Math.PI * 2;
      const radius = r * (1 + (random() * 2 - 1) * wobble);
      return { x: x + Math.cos(angle) * radius * stretch, y: y + Math.sin(angle) * radius };
    }),
  );
}

/** 円。wobble(半径に対する割合)を 0 より大きくすると、ふちが少しがたつく */
export function circlePath(
  cx: number,
  cy: number,
  r: number,
  wobble = 0,
  random?: () => number,
): SkPath {
  if (wobble <= 0 || !random) {
    return Skia.PathBuilder.Make().addCircle(cx, cy, r).build();
  }
  const points = 90;
  const builder = Skia.PathBuilder.Make();
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const radius = r * (1 + (random() - 0.5) * wobble);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) builder.moveTo(x, y);
    else builder.lineTo(x, y);
  }
  return builder.close().build();
}

/**
 * 横に流れる帯。上のふち y0・下のふち y1 を、波打たせながら left〜right までつなぐ。
 * wave:波の高さ(px)
 */
export function bandPath(
  left: number,
  right: number,
  y0: number,
  y1: number,
  wave: number,
  random: () => number,
): SkPath {
  const steps = 8;
  const phase = random() * Math.PI * 2;
  const edge = (y: number, shift: number) =>
    Array.from({ length: steps + 1 }, (_, i) => ({
      x: left + ((right - left) * i) / steps,
      y: y + Math.sin(phase + shift + i * 0.9) * wave + (random() - 0.5) * wave,
    }));
  const top = edge(y0, 0);
  const bottom = edge(y1, 1.3).reverse();
  const builder = Skia.PathBuilder.Make().moveTo(top[0].x, top[0].y);
  top.slice(1).forEach((p) => builder.lineTo(p.x, p.y));
  bottom.forEach((p) => builder.lineTo(p.x, p.y));
  return builder.close().build();
}

/** (x, y) から、向きを少しずつ変えながら伸びるギザギザの線(ひび・光る筋) */
export function crackPath(
  x: number,
  y: number,
  length: number,
  angle: number,
  random: () => number,
): SkPath {
  const steps = 7;
  const builder = Skia.PathBuilder.Make().moveTo(x, y);
  let px = x;
  let py = y;
  let a = angle;
  for (let i = 0; i < steps; i++) {
    a += (random() - 0.5) * 1.1;
    px += (Math.cos(a) * length) / steps;
    py += (Math.sin(a) * length) / steps;
    builder.lineTo(px, py);
  }
  return builder.build();
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

/** canvas を area の形で切り抜いてから draw する(終わったら元に戻す) */
export function clipped(canvas: SkCanvas, area: SkPath, draw: () => void) {
  canvas.save();
  canvas.clipPath(area, ClipOp.Intersect, true);
  try {
    draw();
  } finally {
    canvas.restore();
  }
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

/** area の中に粒を重ねる */
export function drawGrain(canvas: SkCanvas, track: Track, area: SkPath, options: GrainOptions) {
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
  canvas.drawPath(area, paint);
}
