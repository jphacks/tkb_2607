// 惑星の画風の一覧。ここに1行足すと、惑星づくりの候補に出る(並び順 = 候補の並び順)。
import { crayon } from './crayon';
import { pastel } from './pastel';
import type { PlanetStyle } from './types';
import { watercolor } from './watercolor';

export const PLANET_STYLES: PlanetStyle[] = [watercolor, crayon, pastel];

/** 画面なしで作るときと、候補を出したときに最初から選んでおく画風 */
export const DEFAULT_PLANET_STYLE_ID = watercolor.id;

export function getPlanetStyle(id: string): PlanetStyle {
  const style = PLANET_STYLES.find((s) => s.id === id);
  if (!style) throw new Error(`画風「${id}」が見つかりません`);
  return style;
}

export type { BrushOptions, PlanetBrush, PlanetStyle } from './types';
