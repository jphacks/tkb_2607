// ズーム・パン(画面の拡大・移動)の計算。惑星の論理的な配置(半径・角度)は変えず、
// 画面全体にかける「拡大率(zoom)」と「移動量(translateX/Y)」だけを扱う。
// ジェスチャーの処理は UI スレッドで動くので、ここの関数はすべて worklet にしておく。
import { GRAVITY_CONFIG } from './config';

const { minZoom, maxZoom, planetZoomMin, planetZoomMax, fitMargin } = GRAVITY_CONFIG.viewport;

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

/** 拡大率を許される範囲に収める。fitZoom は fitZoomFor の結果(全員が見えるまで縮小できる下限) */
export function clampZoom(zoom: number, fitZoom: number): number {
  'worklet';
  return clamp(zoom, Math.min(minZoom, fitZoom), maxZoom);
}

/** 画面上の惑星1つ(等倍のときの中心と直径) */
export type PlanetBox = { centerX: number; centerY: number; size: number };

/**
 * 全員の惑星が丸ごと画面に入る拡大率(画面の中心を基準に縮小したとき)。
 * 縮小しても惑星の見た目の大きさは変わらない(planetZoomMin)ので、中心どうしの距離だけが縮む前提で計算する。
 * 全員が等倍で見えていれば 1 以上になり、そのときは minZoom が下限になる。
 */
export function fitZoomFor(planets: PlanetBox[], width: number, height: number): number {
  const cx = width / 2;
  const cy = height / 2;
  let fit = Infinity;
  for (const p of planets) {
    const half = (p.size * planetZoomMin) / 2;
    const dx = Math.abs(p.centerX - cx);
    const dy = Math.abs(p.centerY - cy);
    if (dx > 0) fit = Math.min(fit, (cx - fitMargin - half) / dx);
    if (dy > 0) fit = Math.min(fit, (cy - fitMargin - half) / dy);
  }
  // 画面がとても小さいなどで計算できないときは、縮小しない
  return Number.isFinite(fit) && fit > 0 ? fit : minZoom;
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
