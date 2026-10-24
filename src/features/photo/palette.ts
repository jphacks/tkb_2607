// 写真から惑星の色を取り出す。端末の中だけで動く react-native-image-colors を使う。
import ImageColors from 'react-native-image-colors';

import { colorDistance, darken, hexToRgb, lighten, rgbToHex } from './colors';

const MIN_COLORS = 3;
const MAX_COLORS = 5;
/** これより近い色は「ほぼ同じ色」として1つにまとめる(RGB の距離) */
const SAME_COLOR_DISTANCE = 48;
/** 色を取り出せなかったときの色 */
const FALLBACK_COLOR = '#999999';

async function readColors(photoUri: string): Promise<string[]> {
  const result = await ImageColors.getColors(photoUri, {
    fallback: FALLBACK_COLOR,
    quality: 'high',
  });
  if (result.platform === 'ios') {
    return [result.primary, result.secondary, result.detail, result.background];
  }
  if (result.platform === 'android') {
    return [result.vibrant, result.dominant, result.muted, result.average];
  }
  return [result.dominant, result.vibrant, result.muted];
}

/** 近すぎない色だけを足す */
function addIfDistinct(palette: string[], color: string) {
  if (palette.length >= MAX_COLORS) return;
  if (palette.every((c) => colorDistance(c, color) >= SAME_COLOR_DISTANCE)) palette.push(color);
}

/**
 * 写真から 3〜5 色を取り出す。先頭ほど代表的な色。
 * ほぼ同じ色は1つにまとめ、足りなければ先頭の色の明るさを変えた色で補う
 */
export async function extractPlanetPalette(photoUri: string): Promise<string[]> {
  const palette: string[] = [];
  for (const color of await readColors(photoUri)) {
    const rgb = color ? hexToRgb(color) : null;
    if (rgb) addIfDistinct(palette, rgbToHex(rgb));
  }

  const base = palette[0] ?? FALLBACK_COLOR;
  if (palette.length === 0) palette.push(base);
  for (const variant of [
    lighten(base, 0.35),
    darken(base, 0.3),
    lighten(base, 0.6),
    darken(base, 0.5),
  ]) {
    if (palette.length >= MIN_COLORS) break;
    addIfDistinct(palette, variant);
  }
  // 白や黒に近い色だと明るさを変えても近い色しか作れないので、そのときは近くても足す
  for (const variant of [lighten(base, 0.5), darken(base, 0.5)]) {
    if (palette.length >= MIN_COLORS) break;
    palette.push(variant);
  }

  if (__DEV__) console.log(`[photo] 惑星の色:${palette.join(' ')}`);
  return palette;
}
