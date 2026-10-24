// ズーム・パン(画面の拡大・移動)の計算。惑星の論理的な配置(半径・角度)は変えず、
// 画面全体にかける「拡大率(zoom)」と「移動量(translateX/Y)」だけを扱う。
// ジェスチャーの処理は UI スレッドで動くので、ここの関数はすべて worklet にしておく。
import { GRAVITY_CONFIG } from './config';

const { minZoom, maxZoom, planetZoomMin, planetZoomMax } = GRAVITY_CONFIG.viewport;

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

/** 拡大率を許される範囲に収める */
export function clampZoom(zoom: number): number {
  'worklet';
  return clamp(zoom, minZoom, maxZoom);
}

/**
 * 惑星にかける「逆向きの拡大率」。画面全体を zoom 倍にしても、惑星の見た目は
 * planetZoomMin〜planetZoomMax 倍の範囲にとどめる(それを超えると、惑星の間だけが広がる)。
 */
export function planetCounterScale(zoom: number): number {
  'worklet';
  return clamp(zoom, planetZoomMin, planetZoomMax) / zoom;
}

/**
 * 移動量を、中心(自分の惑星のあたり)が画面の外へ出すぎない範囲に収める。
 * 拡大しているほど、大きく動かせる。
 */
export function clampTranslate(translate: number, zoom: number, viewportLength: number): number {
  'worklet';
  const limit = (viewportLength / 2) * Math.max(zoom, 1);
  return clamp(translate, -limit, limit);
}

/**
 * つまんだ指の位置(focal)の下にある点を動かさずに拡大するための移動量。
 * 画面全体の変形は「中心 center を基準に zoom 倍 → translate だけ移動」とする。
 * 画面上の点 p は、変形前の点 q から p = center + translate + zoom × (q − center) に写る。
 */
export function translateKeepingFocal(
  focal: number,
  center: number,
  anchor: number,
  zoom: number,
): number {
  'worklet';
  return focal - center - zoom * (anchor - center);
}

/** translateKeepingFocal の anchor(つまみ始めたときに指の下にあった、変形前の点)を求める */
export function anchorUnderFocal(
  focal: number,
  center: number,
  translate: number,
  zoom: number,
): number {
  'worklet';
  return center + (focal - center - translate) / zoom;
}
