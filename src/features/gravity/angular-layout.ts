// 惑星の角度(中心から見た方向)を決める。スコア計算・半径マッピング・描画とは関心を分ける。
// 入力(userId → 強さ と、方向ごとの距離の求め方)だけから結果が決まる純粋関数にして、同じ顔ぶれなら毎回同じ配置になるようにする。
// 角度は週次更新(顔ぶれが変わるとき)だけ計算し直し、30分ごとの距離の更新では呼び直さない前提。
import type { UserId } from '@/types/domain';

import { GRAVITY_CONFIG, type AngularMode } from './config';

/**
 * userId の人を angle(ラジアン)の方向に置いたときの、中心からの距離(px)。
 * 画面の縦横で最大半径が変わるので、距離は方向によって変わる
 */
export type RadiusAt = (userId: UserId, angle: number) => number;

const TWO_PI = Math.PI * 2;
/** 黄金比 φ。N / φ² がひまわりの種の並びと同じ「飛ばし幅」になる */
const PHI = (1 + Math.sqrt(5)) / 2;
/** 黄金角(約137.5°)= 2π / φ² */
const GOLDEN_ANGLE = TWO_PI / (PHI * PHI);

type Member = { userId: UserId; jitter: number };

/** 中心から見た位置(px)と、中心からの距離 */
type Placement = { x: number; y: number; radius: number };

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * レールを何本ずつ飛ばして割り当てるか。N / φ² に一番近く、N と互いに素な整数。
 * 互いに素なので、0〜N-1 番目の人が全員別々のレールに乗る。
 */
export function pickRailStride(count: number): number {
  if (count <= 2) return 1;
  const target = count / (PHI * PHI);
  let best = 1;
  for (let k = 1; k < count; k++) {
    if (gcd(k, count) !== 1) continue;
    if (Math.abs(k - target) < Math.abs(best - target)) best = k;
  }
  return best;
}

/** userId から -1〜1 の決まった値を作る(FNV-1a ハッシュ)。乱数を使わずに「少しずらす」ため */
function hashToUnit(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return ((hash >>> 0) / 0xffffffff) * 2 - 1;
}

/** 強さ順(強い順 = 近い順)に並べる。同じ強さなら userId 順にして結果を安定させる */
function sortByStrength(strengths: Map<UserId, number>): UserId[] {
  return [...strengths.entries()]
    .sort(([idA, a], [idB, b]) => b - a || (idA < idB ? -1 : idA > idB ? 1 : 0))
    .map(([userId]) => userId);
}

/**
 * レール方式の本体。occupant[s] は s 番目のレールに乗っている人(members の添字)。
 * ひまわりの順番で割り当てたあと、悪さ(重なり・似た距離が隣)が減る入れ替えを繰り返す。
 * 悪さは、そのレールの方向の距離(radiusAt)で置いた、実際の位置で判定する
 */
function assignRails(members: Member[], radiusAt: RadiusAt): number[] {
  const { startAngle, similarRadiusPx, overlapMarginFactor, overlapWeight, similarityWeight } =
    GRAVITY_CONFIG.angular;
  const n = members.length;
  const railGap = TWO_PI / n;
  const minDistance = GRAVITY_CONFIG.layout.planetSize * overlapMarginFactor;

  const stride = pickRailStride(n);
  const occupant = new Array<number>(n);
  members.forEach((_, rank) => {
    occupant[(rank * stride) % n] = rank;
  });

  // 入れ替えのたびに計算し直さないよう、「rank の人を slot のレールに置いたときの位置」を先に全部求めておく
  const placements: Placement[][] = members.map((member) =>
    Array.from({ length: n }, (_, slot) => {
      const angle = startAngle + slot * railGap + member.jitter;
      const radius = radiusAt(member.userId, angle);
      return { x: radius * Math.cos(angle), y: radius * Math.sin(angle), radius };
    }),
  );
  const placeAt = (slot: number) => placements[occupant[slot]][slot];
  const isAdjacent = (s: number, t: number) => {
    const d = Math.abs(s - t);
    return d === 1 || d === n - 1;
  };

  /** レール s と t に乗っている2人の悪さ。重なりは全ペア、似た距離は隣のレールどうしだけ見る */
  const pairCost = (s: number, t: number) => {
    const a = placeAt(s);
    const b = placeAt(t);
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    let cost = overlapWeight * Math.max(0, (minDistance - distance) / minDistance);
    if (isAdjacent(s, t)) {
      cost += similarityWeight * Math.max(0, 1 - Math.abs(a.radius - b.radius) / similarRadiusPx);
    }
    return cost;
  };

  /** レール s と t に関わるペアの悪さの合計(入れ替えで変わるのはここだけ) */
  const localCost = (s: number, t: number) => {
    let cost = 0;
    for (let u = 0; u < n; u++) {
      if (u !== s) cost += pairCost(s, u);
      if (u !== t && u !== s) cost += pairCost(t, u);
    }
    return cost;
  };

  const swap = (s: number, t: number) => {
    [occupant[s], occupant[t]] = [occupant[t], occupant[s]];
  };

  for (let iteration = 0; iteration < GRAVITY_CONFIG.angular.maxSwapIterations; iteration++) {
    let bestDelta = -1e-9;
    let bestPair: [number, number] | null = null;
    for (let s = 0; s < n; s++) {
      for (let t = s + 1; t < n; t++) {
        const before = localCost(s, t);
        swap(s, t);
        const delta = localCost(s, t) - before;
        swap(s, t);
        if (delta < bestDelta) {
          bestDelta = delta;
          bestPair = [s, t];
        }
      }
    }
    if (!bestPair) break;
    swap(bestPair[0], bestPair[1]);
  }

  return occupant;
}

/**
 * userId → 強さ(0〜1、大きいほど関係が強い)から、userId → 角度(ラジアン)を計算する。
 * 順番の割り当ては強さの順で決め、重なりの判定は radiusAt で求めた距離に置いた位置で行う。
 */
export function calculateAngles(
  strengths: Map<UserId, number>,
  radiusAt: RadiusAt,
  mode: AngularMode = GRAVITY_CONFIG.angular.mode,
): Map<UserId, number> {
  const { startAngle, jitterFactor } = GRAVITY_CONFIG.angular;
  const sorted = sortByStrength(strengths);
  const n = sorted.length;
  const angles = new Map<UserId, number>();
  if (n === 0) return angles;

  if (mode === 'golden') {
    sorted.forEach((userId, rank) => angles.set(userId, startAngle + rank * GOLDEN_ANGLE));
    return angles;
  }

  const railGap = TWO_PI / n;
  const jitterScale = mode === 'rails-jitter' && n > 1 ? jitterFactor * railGap : 0;
  const members: Member[] = sorted.map((userId) => ({
    userId,
    jitter: hashToUnit(userId) * jitterScale,
  }));

  const occupant = assignRails(members, radiusAt);
  occupant.forEach((rank, slot) => {
    const member = members[rank];
    angles.set(member.userId, startAngle + slot * railGap + member.jitter);
  });
  return angles;
}
