// 引力・描画担当の公開窓口。土台はここから import する。
import { GRAVITY_CONFIG } from './config';

export type { GravityViewProps } from './contract';
export { GravityView } from './gravity-view';
export type { AngularMode } from './config';

/** ホームに出す惑星の最大人数。土台は useHome にこの人数を渡す(顔ぶれの人数と画面に出る人数をそろえる) */
export const MAX_VISIBLE_PLANETS = GRAVITY_CONFIG.maxVisiblePlanets;

/** 惑星の大きさ(倍率)を変えられる範囲と、範囲に収める関数。ホームで惑星どうしが重ならない大きさまで */
export { clampPlanetScale, PLANET_SCALE_RANGE } from './planet-scale';
