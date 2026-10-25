// 色の計算。色は "#RRGGBB" の文字列で扱う。

export type Rgb = { r: number; g: number; b: number };

/** "#RGB"・"#RRGGBB"・"#RRGGBBAA" を読む(透明度は使わない)。読めなければ null */
export function hexToRgb(hex: string): Rgb | null {
  const value = hex.trim().replace(/^#/, '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const part = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/** a と b を t(0〜1)の割合で混ぜる。t = 0 で a、1 で b */
export function mixColors(a: string, b: string, t: number): string {
  const x = hexToRgb(a) ?? { r: 0, g: 0, b: 0 };
  const y = hexToRgb(b) ?? { r: 0, g: 0, b: 0 };
  return rgbToHex({
    r: x.r + (y.r - x.r) * t,
    g: x.g + (y.g - x.g) * t,
    b: x.b + (y.b - x.b) * t,
  });
}

/** 白に寄せて明るくする(t = 1 で白) */
export function lighten(color: string, t: number): string {
  return mixColors(color, '#FFFFFF', t);
}

/** 黒に寄せて暗くする(t = 1 で黒) */
export function darken(color: string, t: number): string {
  return mixColors(color, '#000000', t);
}

/** 色の近さ(RGB の距離。0 で同じ色、最大は約 441) */
export function colorDistance(a: string, b: string): number {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  if (!x || !y) return Infinity;
  return Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b);
}

/** 明るさ(0〜1)。人の目に明るく見える緑を重く数える */
export function luminance(color: string): number {
  const { r, g, b } = hexToRgb(color) ?? { r: 0, g: 0, b: 0 };
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** 色み(h:0〜360 度。0 が赤、120 が緑、240 が青)・鮮やかさ(s:0〜1)・明るさ(l:0〜1) */
export function toHsl(color: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(color) ?? { r: 0, g: 0, b: 0 };
  const [x, y, z] = [r / 255, g / 255, b / 255];
  const max = Math.max(x, y, z);
  const min = Math.min(x, y, z);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === x ? ((y - z) / d + 6) % 6 : max === y ? (z - x) / d + 2 : (x - y) / d + 4;
  return { h: h * 60, s: Math.min(1, s), l };
}

/** 色みの差(0〜180 度) */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** 色み target(度)にどれだけ近く、どれだけ鮮やかか(0〜1)。「いちばん青い色」などを選ぶのに使う */
export function hueScore(color: string, target: number): number {
  const { h, s, l } = toHsl(color);
  const closeness = 1 - hueDistance(h, target) / 180;
  // 白や黒に近い色は、色みがあっても目立たないので低くする
  const visible = 1 - Math.abs(l - 0.5) * 1.4;
  return s * closeness * closeness * Math.max(0, visible);
}

/** 色を少しだけ明るく・暗くゆらがせる(amount:最大の変化量) */
export function varyColor(color: string, random: () => number, amount: number): string {
  const t = (random() * 2 - 1) * amount;
  return t >= 0 ? lighten(color, t) : darken(color, -t);
}

/** score がいちばん大きい色 */
export function pickColor(palette: string[], score: (color: string) => number): string {
  return palette.reduce((a, b) => (score(b) > score(a) ? b : a));
}

/** いちばん明るい色 */
export function lightestColor(palette: string[]): string {
  return palette.reduce((a, b) => (luminance(b) > luminance(a) ? b : a));
}
