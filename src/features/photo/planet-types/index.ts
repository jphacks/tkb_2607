// 惑星の種類の一覧。ここに1行足すと、planet-traits.ts の対応表で使えるようになる。
import { gas } from './gas';
import { ice } from './ice';
import { lava } from './lava';
import { ocean } from './ocean';
import { rocky } from './rocky';
import type { PlanetType } from './types';

export const PLANET_TYPES: PlanetType[] = [gas, lava, ice, ocean, rocky];

export function getPlanetType(id: string): PlanetType {
  const type = PLANET_TYPES.find((t) => t.id === id);
  if (!type) throw new Error(`惑星の種類「${id}」が見つかりません`);
  return type;
}

export type { PlanetType, PlanetTypeContext } from './types';
