// 「関係の強さ(0〜1)」を画面上の半径(px)に変換する。スコア計算・描画とは関心を分ける。
import { GRAVITY_CONFIG } from './config';

/**
 * strength(0〜1、大きいほど関係性が強い)を半径に変換する。
 * strength が 1 に近いほど半径は小さく(中心に近く)、0 に近いほど半径は大きく(外側に)なる。
 */
export function mapStrengthToRadius(strength: number, maxRadius: number): number {
  const { planetSize, minRadiusFactor } = GRAVITY_CONFIG.layout;
  const minRadius = planetSize * minRadiusFactor;
  const clamped = Math.max(0, Math.min(1, strength));
  return minRadius + (1 - clamped) * (maxRadius - minRadius);
}

/**
 * 中心(自分の惑星)から、枠(デザインの画面)の一番近い端までの距離をもとに、惑星を配置できる最大半径を計算する。
 * 座標はデザイン上の値(home-layout.ts の DESIGN_FRAME)で渡す。画面の大きさには依存しない。
 */
export function calculateMaxRadius(
  center: { x: number; y: number },
  frame: { width: number; height: number },
): number {
  const { planetSize } = GRAVITY_CONFIG.layout;
  const nearestEdge = Math.min(center.x, frame.width - center.x, center.y, frame.height - center.y);
  return nearestEdge - planetSize;
}
