import type { SkCanvas, SkPath } from '@shopify/react-native-skia';

/**
 * 惑星の模様を描く関数。どの画風もこの形にそろえる。
 * - canvas:size×size のキャンバス。惑星の形で切り抜いてあるので、はみ出して描いてよい
 * - palette:写真から取り出した色(3〜5 色、先頭ほど代表的な色)
 * - seed:同じ値なら同じ模様になる。値を変えると模様が少しずつ変わる
 * 片側を暗くする陰影は、描いたあとに共通で重ねるので、ここでは描かなくてよい
 */
export type PlanetDraw = (canvas: SkCanvas, palette: string[], size: number, seed: number) => void;

export type PlanetStyle = {
  /** 画風の名前(英数字。保存やログに使う) */
  id: string;
  /** 画面に出す画風の名前 */
  label: string;
  draw: PlanetDraw;
  /** 惑星のふちの形。省略すると、なめらかな円 */
  outline?: (size: number, seed: number) => SkPath;
};
