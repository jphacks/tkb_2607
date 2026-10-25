// 惑星の大きさ(倍率)を変えられる範囲。ホームの配置の計算(半径・角度)は惑星を標準の大きさとして行うので、
// その計算が「重ならない」とみなす距離を超えない大きさまでにする。config.ts の数値を変えると上限も追従する。
import { GRAVITY_CONFIG } from './config';
import { ME_SLOT } from './home-layout';

const { planetSize, minRadiusFactor } = GRAVITY_CONFIG.layout;
const { overlapMarginFactor } = GRAVITY_CONFIG.angular;

/** 小さくする分には重ならないので、見た目で決めた下限 */
const MIN_SCALE = 0.6;

/** 他の人の惑星として:角度の計算は、中心どうしが planetSize × overlapMarginFactor 以上離れていれば重ならないとみなす */
const asCandidate = overlapMarginFactor;
/**
 * 自分の惑星として:一番近い人は中心から planetSize × minRadiusFactor の距離に来る。
 * そこに上限の大きさの惑星が来ても、自分の惑星(ME_SLOT)とくっつかない大きさまで
 */
const asMe = (2 * planetSize * minRadiusFactor - planetSize * asCandidate) / ME_SLOT.size;
/** ボタンなど(config.ts の avoidAreas)には、惑星の中心が planetSize / 2 + padding より近づかない(radius.ts の calculateMaxRadiusAt) */
const asNearButtons = (planetSize / 2 + GRAVITY_CONFIG.avoidAreas.padding) / (planetSize / 2);

/** 同じ倍率で、自分のホームでは中心に、相手のホームでは周りに描かれるので、全部を満たす大きさまで */
export const PLANET_SCALE_RANGE = {
  min: MIN_SCALE,
  max: Math.floor(Math.min(asCandidate, asMe, asNearButtons) * 100) / 100,
} as const;

/** 保存された倍率を、今の範囲に収める(config.ts を変えて上限が下がった場合にも重ならないように) */
export function clampPlanetScale(scale: number): number {
  return Math.min(PLANET_SCALE_RANGE.max, Math.max(PLANET_SCALE_RANGE.min, scale));
}
