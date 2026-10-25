// 水彩の惑星のテクスチャ。人が用意した画像の「明るさ」だけを使い、写真から取った色を割り当てる
// (グラデーションマップ:暗い所→濃い色、明るい所→淡い色)。にじみや紙の質感は画像のまま残り、色だけが変わる。
// 画像の読み込みと下ごしらえは最初の1回だけ行い、あとは使い回す。
import {
  AlphaType,
  ColorType,
  FilterMode,
  MipmapMode,
  Skia,
  TileMode,
  loadData,
  type SkCanvas,
  type SkImage,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';

import { luminance } from './colors';
import { between, randomPointInCircle, type Track } from './planet-draw';

/**
 * 種類(planet-types の id)ごとのテクスチャ画像。1つの種類に複数置くと、seed で選ぶ。
 * 画像は白い背景(または透明)の中央に、惑星が1つ描かれたもの
 */
const TEXTURE_SOURCES: Record<string, number[]> = {};

/** 種類ごとの画像がないときに使う見本(白い背景の中央に惑星、外周に細い灰色の枠) */
const FALLBACK_SOURCES: number[] = [require('./assets/reference/watercolor.webp')];

/** 下ごしらえした画像の1辺(px)。惑星の円が、この正方形いっぱいに収まる */
const TEXTURE_SIZE = 1024;
/** 惑星の範囲を探すときに縮める大きさ(px) */
const ANALYZE_SIZE = 256;
/** これより明るい所は、背景の白とみなす */
const WHITE = 0.94;
/** 画像の外周の枠を無視する幅(画像に対する割合) */
const FRAME_MARGIN = 0.03;
/** 明るさの範囲を決めるとき、両端から外す割合(ほこりのような点に引っぱられないように) */
const BRIGHTNESS_CLIP = 0.02;
/** 拡大の範囲(テクスチャの中から使う範囲を、この倍率で拡大する) */
const ZOOM = [1, 1.3];

export type PlanetTexture = {
  /** 惑星の部分だけを切り出した正方形の画像 */
  image: SkImage;
  /** 惑星の中の明るさの範囲。グラデーションマップで、この範囲を色の端から端に広げる */
  low: number;
  high: number;
};

/** 読み込んだテクスチャ(画像ごとに1回だけ読み込み、アプリを閉じるまで使い回す) */
const cache = new Map<number, Promise<PlanetTexture>>();

/** 縮めた画像を読み、白くない部分(惑星)の範囲と、惑星の中の明るさの範囲を求める */
function analyze(original: SkImage) {
  const surface = Skia.Surface.Make(ANALYZE_SIZE, ANALYZE_SIZE);
  if (!surface) throw new Error('テクスチャを調べるキャンバスを作れませんでした');
  try {
    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color('transparent'));
    canvas.drawImageRectOptions(
      original,
      Skia.XYWHRect(0, 0, original.width(), original.height()),
      Skia.XYWHRect(0, 0, ANALYZE_SIZE, ANALYZE_SIZE),
      FilterMode.Linear,
      MipmapMode.None,
      null,
    );
    surface.flush();
    const small = surface.makeImageSnapshot();
    const pixels = small.readPixels(0, 0, {
      width: ANALYZE_SIZE,
      height: ANALYZE_SIZE,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    });
    small.dispose();
    if (!pixels) throw new Error('テクスチャの色を読めませんでした');

    // 1 ピクセルずつ読むので、色の文字列は作らずに数値のまま明るさを計算する(colors.ts の luminance と同じ式)
    const at = (x: number, y: number) => {
      const i = (y * ANALYZE_SIZE + x) * 4;
      return {
        alpha: pixels[i + 3] / 255,
        luma: (0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]) / 255,
      };
    };

    // 白くない部分の範囲 = 惑星の範囲(外周の枠は無視する)
    const margin = Math.ceil(ANALYZE_SIZE * FRAME_MARGIN);
    let minX = ANALYZE_SIZE;
    let minY = ANALYZE_SIZE;
    let maxX = -1;
    let maxY = -1;
    for (let y = margin; y < ANALYZE_SIZE - margin; y++) {
      for (let x = margin; x < ANALYZE_SIZE - margin; x++) {
        const p = at(x, y);
        if (p.alpha > 0.5 && p.luma < WHITE) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    const found = maxX >= minX && maxY >= minY;
    const cx = found ? (minX + maxX + 1) / 2 : ANALYZE_SIZE / 2;
    const cy = found ? (minY + maxY + 1) / 2 : ANALYZE_SIZE / 2;
    const r = found ? Math.max(maxX - minX + 1, maxY - minY + 1) / 2 : ANALYZE_SIZE * 0.45;

    // 惑星の中(ふちの近くは除く)の明るさの範囲
    const lumas: number[] = [];
    for (let y = 0; y < ANALYZE_SIZE; y++) {
      for (let x = 0; x < ANALYZE_SIZE; x++) {
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r * 0.95) lumas.push(at(x, y).luma);
      }
    }
    lumas.sort((a, b) => a - b);
    let low = lumas[Math.floor(lumas.length * BRIGHTNESS_CLIP)] ?? 0;
    let high = lumas[Math.floor(lumas.length * (1 - BRIGHTNESS_CLIP))] ?? 1;
    if (high - low < 0.05) {
      low = 0;
      high = 1;
    }

    const scale = original.width() / ANALYZE_SIZE;
    return { cx: cx * scale, cy: cy * scale, r: r * scale, low, high };
  } finally {
    surface.dispose();
  }
}

async function loadTexture(source: number): Promise<PlanetTexture> {
  const original = await loadData(source, (data) => Skia.Image.MakeImageFromEncoded(data));
  if (!original) throw new Error('惑星のテクスチャを読み込めませんでした');
  try {
    const { cx, cy, r, low, high } = analyze(original);
    // 惑星の部分だけを切り出して縮め、元の大きな画像はすぐ解放する
    const surface = Skia.Surface.Make(TEXTURE_SIZE, TEXTURE_SIZE);
    if (!surface) throw new Error('テクスチャを切り出すキャンバスを作れませんでした');
    try {
      const canvas = surface.getCanvas();
      canvas.clear(Skia.Color('transparent'));
      canvas.drawImageRectOptions(
        original,
        Skia.XYWHRect(cx - r, cy - r, r * 2, r * 2),
        Skia.XYWHRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE),
        FilterMode.Linear,
        MipmapMode.None,
        null,
      );
      surface.flush();
      const image = surface.makeImageSnapshot();
      if (__DEV__) {
        console.log(
          `[photo] テクスチャを読み込んだ(惑星の半径 ${Math.round(r)}px、明るさ ${low.toFixed(2)}〜${high.toFixed(2)})`,
        );
      }
      return { image, low, high };
    } finally {
      surface.dispose();
    }
  } finally {
    original.dispose();
  }
}

/** 種類に合うテクスチャを seed で選んで返す(初めて使う画像のときだけ読み込む) */
export function getPlanetTexture(typeId: string, seed: number): Promise<PlanetTexture> {
  const sources = TEXTURE_SOURCES[typeId] ?? FALLBACK_SOURCES;
  const source = sources[seed % sources.length];
  let texture = cache.get(source);
  if (!texture) {
    texture = loadTexture(source);
    // 読み込みに失敗したときは、次に使うときにもう一度読み込めるようにする
    texture.catch(() => cache.delete(source));
    cache.set(source, texture);
  }
  return texture;
}

// グラデーションマップ:テクスチャの明るさを、暗い順に並べた色(2〜4 色)のグラデーションに置き換える。
// 元の画像の透明度はそのまま残す
const GRADIENT_MAP_SKSL = `
uniform shader texture;
uniform float low;
uniform float high;
uniform float count;
uniform float3 c0;
uniform float3 c1;
uniform float3 c2;
uniform float3 c3;

half4 main(float2 p) {
  half4 src = texture.eval(p);
  if (src.a <= 0.001) {
    return half4(0);
  }
  float3 rgb = float3(src.rgb) / float(src.a);
  float l = dot(rgb, float3(0.299, 0.587, 0.114));
  float t = clamp((l - low) / max(high - low, 0.001), 0.0, 1.0) * (count - 1.0);
  float3 color = mix(c0, c1, clamp(t, 0.0, 1.0));
  color = mix(color, c2, clamp(t - 1.0, 0.0, 1.0));
  color = mix(color, c3, clamp(t - 2.0, 0.0, 1.0));
  return half4(half3(color) * src.a, src.a);
}
`;

let gradientMapEffect: SkRuntimeEffect | null = null;

function getGradientMapEffect(): SkRuntimeEffect {
  gradientMapEffect ??= Skia.RuntimeEffect.Make(GRADIENT_MAP_SKSL);
  if (!gradientMapEffect) throw new Error('グラデーションマップのシェーダーを作れませんでした');
  return gradientMapEffect;
}

/**
 * テクスチャに palette の色を割り当てて、(cx, cy) を中心とする半径 r の本体に描く。
 * cover:テクスチャで必ず覆う範囲の半径(ふちのがたつき・にじみで r より外に出る分を含める)。
 * random で、回転・反転・拡大(テクスチャの一部を使う)・位置のずれを変える
 */
export function drawTexturedBody(
  canvas: SkCanvas,
  track: Track,
  texture: PlanetTexture,
  palette: string[],
  cx: number,
  cy: number,
  r: number,
  cover: number,
  random: () => number,
) {
  // テクスチャの惑星の円(半径 r × zoom)が、cover の円を覆える大きさより小さくならないようにする
  const zoom = Math.max(between(random, ZOOM[0], ZOOM[1]), cover / r);
  const angle = random() * 360;
  const flip = random() < 0.5 ? -1 : 1;
  // 覆う範囲より大きい分だけなら、位置をずらしても cover の中にテクスチャの外(背景)が入らない
  const shift = randomPointInCircle(random, 0, 0, (zoom * r - cover) * 0.9);
  const scale = (r * 2 * zoom) / TEXTURE_SIZE;

  // 暗い色から明るい色の順に並べ、4 色に満たなければ最後の色をくり返す
  const colors = [...palette].sort((a, b) => luminance(a) - luminance(b)).slice(0, 4);
  const rgb = (i: number) => {
    const c = Skia.Color(colors[Math.min(i, colors.length - 1)]);
    return [c[0], c[1], c[2]];
  };

  const paint = track(Skia.Paint());
  paint.setAntiAlias(true);
  paint.setShader(
    track(
      getGradientMapEffect().makeShaderWithChildren(
        [texture.low, texture.high, colors.length, ...rgb(0), ...rgb(1), ...rgb(2), ...rgb(3)],
        [
          track(
            texture.image.makeShaderOptions(
              TileMode.Clamp,
              TileMode.Clamp,
              FilterMode.Linear,
              MipmapMode.None,
            ),
          ),
        ],
      ),
    ),
  );

  canvas.save();
  canvas.translate(cx + shift.x, cy + shift.y);
  canvas.rotate(angle, 0, 0);
  canvas.scale(scale * flip, scale);
  canvas.translate(-TEXTURE_SIZE / 2, -TEXTURE_SIZE / 2);
  canvas.drawRect(Skia.XYWHRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE), paint);
  canvas.restore();
}
