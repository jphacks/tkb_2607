// 惑星の角度(中心から見た方向)を決める。スコア計算・半径マッピング・描画とは関心を分ける。
// 入力(userId → 半径)だけから結果が決まる純粋関数にして、同じ顔ぶれなら毎回同じ配置になるようにする。
// 角度は週次更新(顔ぶれが変わるとき)だけ計算し直し、30分ごとの距離の更新では呼び直さない前提。
import type { UserId } from '@/types/domain';

import { GRAVITY_CONFIG, type AngularMode } from './config';

const TWO_PI = Math.PI * 2;
/** 黄金比 φ。N / φ² がひまわりの種の並びと同じ「飛ばし幅」になる */
const PHI = (1 + Math.sqrt(5)) / 2;
/** 黄金角(約137.5°)= 2π / φ² */
const GOLDEN_ANGLE = TWO_PI / (PHI * PHI);

type Member = { userId: UserId; radius: number; jitter: number };

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

/** 半径 ra・rb、角度の差 dTheta の2点の距離(余弦定理) */
function distanceBetween(ra: number, rb: number, dTheta: number): number {
  return Math.sqrt(Math.max(0, ra * ra + rb * rb - 2 * ra * rb * Math.cos(dTheta)));
}

/** 強さ順(半径が小さい順)に並べる。同じ半径なら userId 順にして結果を安定させる */
function sortByStrength(radii: Map<UserId, number>): { userId: UserId; radius: number }[] {
  return [...radii.entries()]
    .map(([userId, radius]) => ({ userId, radius }))
    .sort(
      (a, b) => a.radius - b.radius || (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0),
    );
}

/**
 * レール方式の本体。occupant[s] は s 番目のレールに乗っている人(members の添字)。
 * ひまわりの順番で割り当てたあと、悪さ(重なり・似た半径が隣)が減る入れ替えを繰り返す。
 */
function assignRails(members: Member[]): number[] {
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

  const angleAt = (slot: number) => startAngle + slot * railGap + members[occupant[slot]].jitter;
  const isAdjacent = (s: number, t: number) => {
    const d = Math.abs(s - t);
    return d === 1 || d === n - 1;
  };

  /** レール s と t に乗っている2人の悪さ。重なりは全ペア、似た半径は隣のレールどうしだけ見る */
  const pairCost = (s: number, t: number) => {
    const a = members[occupant[s]];
    const b = members[occupant[t]];
    const distance = distanceBetween(a.radius, b.radius, angleAt(s) - angleAt(t));
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
 * userId → 半径(px)から、userId → 角度(ラジアン)を計算する。
 * 半径は radius.ts の mapStrengthToRadius の結果を渡す(半径が小さい = 関係が強い)。
 */
export function calculateAngles(
  radii: Map<UserId, number>,
  mode: AngularMode = GRAVITY_CONFIG.angular.mode,
): Map<UserId, number> {
  const { startAngle, jitterFactor } = GRAVITY_CONFIG.angular;
  const sorted = sortByStrength(radii);
  const n = sorted.length;
  const angles = new Map<UserId, number>();
  if (n === 0) return angles;

  if (mode === 'golden') {
    sorted.forEach(({ userId }, rank) => angles.set(userId, startAngle + rank * GOLDEN_ANGLE));
    return angles;
  }

  const railGap = TWO_PI / n;
  const jitterScale = mode === 'rails-jitter' && n > 1 ? jitterFactor * railGap : 0;
  const members: Member[] = sorted.map(({ userId, radius }) => ({
    userId,
    radius,
    jitter: hashToUnit(userId) * jitterScale,
  }));

  const occupant = assignRails(members);
  occupant.forEach((rank, slot) => {
    const member = members[rank];
    angles.set(member.userId, startAngle + slot * railGap + member.jitter);
  });
  return angles;
}
