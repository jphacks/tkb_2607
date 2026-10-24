import type { Track } from '../planet-draw';
import type { PlanetBrush } from '../planet-styles/types';

export type PlanetTypeContext = {
  /** 画風の塗る道具。形と色を渡すと、その画風らしく塗ってくれる */
  brush: PlanetBrush;
  /** 写真から取り出した色(3〜4 色、先頭ほど代表的な色) */
  palette: string[];
  /** 本体の中心と半径(px) */
  cx: number;
  cy: number;
  radius: number;
  /** 模様の種から作った乱数(0 以上 1 未満) */
  random: () => number;
  /** 作った Skia の部品(パスなど)を登録すると、描き終わったときに dispose() される */
  track: Track;
};

/**
 * 惑星の種類。どこに・どの色の模様を置くかだけを決める。
 * 本体の形での切り抜き・下地・質感・陰影は、描く側(planet-art.ts)が共通でつける。
 * 本体より少しはみ出して描いてもよい
 */
export type PlanetType = {
  /** 種類の名前(英数字。planet-traits.ts の対応表で使う) */
  id: string;
  /** 画面に出す種類の名前(「〇〇になりました」の〇〇) */
  label: string;
  /**
   * 土台の塗り(帯・海・地面など、本体全体を覆う塗り)。
   * テクスチャを使う画風(水彩)では、これの代わりにテクスチャを塗る
   */
  base(context: PlanetTypeContext): void;
  /** 土台の上に重ねる特徴(光る筋・極冠・大陸と雲・クレーターなど)。どの画風でも描く */
  details(context: PlanetTypeContext): void;
};
