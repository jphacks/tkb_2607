// 「関係の強さ(0〜1)」を画面上の半径(px)に変換する。スコア計算・描画とは関心を分ける。
import type { UserId } from '@/types/domain';

import { GRAVITY_CONFIG } from './config';
import type { DesignRect } from './home-layout';

type Point = { x: number; y: number };

/** 角を丸めた長方形(radius が角の丸めの半径) */
type RoundedRect = DesignRect & { radius: number };

/**
 * strength(0〜1、大きいほど関係性が強い)を半径に変換する。
 * strength が 1 に近いほど半径は小さく(中心に近く)、0 に近いほど半径は大きく(外側に)なる。
 * maxRadius は、その惑星を置く方向の最大半径(calculateMaxRadiusAt)を渡す
 */
export function mapStrengthToRadius(strength: number, maxRadius: number): number {
  const { planetSize, minRadiusFactor } = GRAVITY_CONFIG.layout;
  const minRadius = planetSize * minRadiusFactor;
  const clamped = Math.max(0, Math.min(1, strength));
  return minRadius + (1 - clamped) * (maxRadius - minRadius);
}

/**
 * from から (dx, dy)(長さ 1)の方向に進んで、内側にいる area の外に出るまでの距離。
 * まず角ばった長方形の端までを求め、そこが角の丸めの範囲なら、丸めの円に当たるまでにする
 */
function distanceToLeave(from: Point, dx: number, dy: number, area: RoundedRect): number {
  let distance = Infinity;
  if (dx > 1e-9) distance = Math.min(distance, (area.right - from.x) / dx);
  if (dx < -1e-9) distance = Math.min(distance, (area.left - from.x) / dx);
  if (dy > 1e-9) distance = Math.min(distance, (area.bottom - from.y) / dy);
  if (dy < -1e-9) distance = Math.min(distance, (area.top - from.y) / dy);

  const r = area.radius;
  if (r <= 0 || !Number.isFinite(distance)) return distance;
  const hitX = from.x + distance * dx;
  const hitY = from.y + distance * dy;
  // 当たった点が角の丸めの範囲(角の r × r の正方形)なら、その角の丸めの円の中心
  const cornerX =
    hitX > area.right - r ? area.right - r : hitX < area.left + r ? area.left + r : null;
  const cornerY =
    hitY > area.bottom - r ? area.bottom - r : hitY < area.top + r ? area.top + r : null;
  if (cornerX === null || cornerY === null) return distance;
  // |from + t(dx, dy) − 円の中心| = r を t について解き、円から出る方(大きい方)の解を使う
  const fx = from.x - cornerX;
  const fy = from.y - cornerY;
  const b = fx * dx + fy * dy;
  const disc = b * b - (fx * fx + fy * fy - r * r);
  return disc >= 0 ? Math.min(distance, -b + Math.sqrt(disc)) : distance;
}

/** from から (dx, dy) の方向に進んで、外にある area に入るまでの距離。当たらなければ null */
function distanceToEnter(from: Point, dx: number, dy: number, area: DesignRect): number | null {
  let enter = -Infinity;
  let exit = Infinity;
  for (const [p, d, low, high] of [
    [from.x, dx, area.left, area.right],
    [from.y, dy, area.top, area.bottom],
  ]) {
    if (Math.abs(d) < 1e-9) {
      if (p < low || p > high) return null;
      continue;
    }
    const t1 = (low - p) / d;
    const t2 = (high - p) / d;
    enter = Math.max(enter, Math.min(t1, t2));
    exit = Math.min(exit, Math.max(t1, t2));
  }
  if (exit < Math.max(enter, 0)) return null;
  return Math.max(enter, 0);
}

export type MaxRadiusOptions = {
  /** はみ出しの許容(config.ts の visibleMarginFactor)。省略時は config.ts の値 */
  marginFactor?: number;
  /** 惑星を置かない範囲(ボタンなど。デザイン上の座標)。惑星のふちがかからない所までにする */
  avoid?: DesignRect[];
  /** 名前ラベルを出す惑星なら true。下の方向だけ、ラベルまで画面に入る位置までにする */
  labeled?: boolean;
};

/**
 * 中心(自分の惑星)から angle(ラジアン)の方向に置ける、最大の半径。縦長の画面では、縦の方向ほど遠くまでになる。
 * - 見えている範囲の上下左右の端から、planetSize × marginFactor までは外に出てよい
 * - 四隅は角を丸め、中心が見えている範囲の角より外に出ないようにする(斜めの方向でも約25%以上は見える)
 * - ラベルを出す惑星は、下の端だけ、ラベルまで画面に入る位置までにする
 * - avoid(ボタンなど)にふちがかかる所より手前までにする
 * 座標はデザイン上の値(home-layout.ts の DESIGN_FRAME)で渡す。visible は visibleDesignRect の結果
 */
export function calculateMaxRadiusAt(
  center: Point,
  visible: DesignRect,
  angle: number,
  options: MaxRadiusOptions = {},
): number {
  const { planetSize, minRadiusFactor, visibleMarginFactor, label } = GRAVITY_CONFIG.layout;
  const margin = planetSize * (options.marginFactor ?? visibleMarginFactor);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  // 角の丸めの半径。斜め 45 度の方向で、中心がちょうど見えている範囲の角に来る大きさ
  // (丸めの円の中心は角から (r − margin) 内側。そこから r / √2 進んだ点が角になる r)
  const cornerRadius = margin / (1 - Math.SQRT1_2);
  const bottom = options.labeled
    ? visible.bottom - (planetSize / 2 + label.gap + label.height)
    : visible.bottom + margin;
  const area = {
    left: visible.left - margin,
    top: visible.top - margin,
    right: visible.right + margin,
    bottom,
  };
  const halfShortSide = Math.min(area.right - area.left, area.bottom - area.top) / 2;
  let distance = distanceToLeave(center, dx, dy, {
    ...area,
    radius: Math.min(cornerRadius, halfShortSide),
  });

  // ボタンなどを、惑星の半径とすき間の分だけ広げた範囲に、惑星の中心が入らない所までにする
  const keepOut = planetSize / 2 + GRAVITY_CONFIG.avoidAreas.padding;
  for (const avoid of options.avoid ?? []) {
    const hit = distanceToEnter(center, dx, dy, {
      left: avoid.left - keepOut,
      top: avoid.top - keepOut,
      right: avoid.right + keepOut,
      bottom: avoid.bottom + keepOut,
    });
    if (hit !== null) distance = Math.min(distance, hit);
  }

  // とても狭い画面でも、最小半径より内側にはしない
  return Math.max(planetSize * minRadiusFactor, distance);
}

/**
 * 強さに、強さの順位から作った値(1位 = 1、最下位 = 0)を rankBlend の割合で混ぜる。
 * 全員の強さが似ていても、距離が順位どおりに散らばるようにするため。rankBlend = 0 ならそのまま返す。
 * rankBlend は 0〜1 に収める。同じ強さなら userId 順にして、結果を安定させる
 */
export function blendStrengthsWithRank(
  strengths: Map<UserId, number>,
  rankBlend: number = GRAVITY_CONFIG.layout.rankBlend,
): Map<UserId, number> {
  const blend = Math.max(0, Math.min(1, rankBlend));
  const n = strengths.size;
  if (blend === 0 || n <= 1) return strengths;
  const sorted = [...strengths.entries()].sort(
    ([idA, a], [idB, b]) => b - a || (idA < idB ? -1 : idA > idB ? 1 : 0),
  );
  return new Map(
    sorted.map(([userId, strength], rank) => {
      const rankStrength = 1 - rank / (n - 1);
      return [userId, (1 - blend) * strength + blend * rankStrength];
    }),
  );
}
