import type { SkCanvas, SkPath } from '@shopify/react-native-skia';

import type { Track } from '../planet-draw';

export type BrushOptions = {
  /** 不透明度(0〜1)。省略すると 1 */
  alpha?: number;
  /** ふちを大きくぼかす(光る筋・雲など) */
  soft?: boolean;
};

/**
 * 画風ごとの「塗る道具」。種類(planet-types)は、何をどこにどの色で置くかだけを決め、
 * 実際の塗り方(にじみ・かすれ・粉っぽさ)はこの道具が担当する
 */
export type PlanetBrush = {
  /** 下地(紙)を area に塗る。本体・輪・衛星それぞれで最初に1回呼ばれる */
  ground(area: SkPath): void;
  /** path の形を color で塗る */
  fill(path: SkPath, color: string, options?: BrushOptions): void;
  /** path に沿って、太さ width の線を引く */
  stroke(path: SkPath, color: string, width: number, options?: BrushOptions): void;
  /** 塗り終わったあとに、画風の質感(紙のざらつき・粒など)を area に重ねる */
  texture(area: SkPath): void;
  /** 形のふちをなぞる(省略すると、なぞらない) */
  outline?(area: SkPath): void;
  /**
   * 陰影を、この画風のやり方で描く。(cx, cy, r) は陰影をつける丸。
   * 省略すると、共通の陰影(左上から光、右下が暗いグラデーション)を重ねる
   */
  shade?(area: SkPath, cx: number, cy: number, r: number): void;
};

export type PlanetStyle = {
  /** 画風の名前(英数字。保存やログに使う) */
  id: string;
  /** 画面に出す画風の名前 */
  label: string;
  /** 惑星のふちのがたつき(半径に対する割合)。0 でなめらかな円 */
  edgeWobble: number;
  /** 惑星のふちのぼかし(px)。0 でくっきり */
  edgeSoftness: number;
  /** true なら、本体の土台の塗りに水彩のテクスチャ(planet-texture.ts)を使う */
  usesTexture?: boolean;
  /** 共通の陰影の濃さ(0〜1)。省略すると 1 */
  shadeStrength?: number;
  /**
   * size×size の canvas に、この画風で塗る道具を作る。
   * palette は写真から取り出した色、seed は模様の種。作った Skia の部品は track に登録する
   */
  createBrush(
    canvas: SkCanvas,
    size: number,
    palette: string[],
    seed: number,
    track: Track,
  ): PlanetBrush;
};
