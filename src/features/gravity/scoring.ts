// 関係性スコアの計算。候補者1人ぶんの材料(HomeCandidate)から、0〜1 のスコアを返す。
// 描画・半径マッピングとは関心を分け、ここでは数値計算だけを行う。
import type { HomeCandidate, HomeUser } from '@/types/domain';

import { GRAVITY_CONFIG } from './config';

/** 前後の空白・大文字小文字だけそろえる。正式名称での入力を前提にした簡易な正規化 */
function normalizeOrganization(value: string | null): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

/** 所属団体が一致しているか(どちらか未入力なら不一致扱い) */
export function isSameOrganization(mine: string | null, theirs: string | null): boolean {
  const a = normalizeOrganization(mine);
  const b = normalizeOrganization(theirs);
  return a !== null && b !== null && a === b;
}

/**
 * すれ違い回数を 0〜1 に正規化する。
 * 累積回数は上限がないので対数スケールにし、saturationCount 回前後で頭打ちにする。
 * これにより、1人だけ飛び抜けて回数が多くても、他の人のスコアには影響しない
 * (後段の半径マッピングを「絶対スコア」ベースにできる)。
 */
function normalizeEncounterCount(encounterCount: number): number {
  const { saturationCount } = GRAVITY_CONFIG.encounterNormalization;
  if (encounterCount <= 0) return 0;
  const normalized = Math.log(1 + encounterCount) / Math.log(1 + saturationCount);
  return Math.min(1, normalized);
}

/** タグの Jaccard 係数(共通タグ数 ÷ タグ和集合数)。すでに 0〜1 に収まっている */
function tagSimilarity(sharedTagCount: number, tagUnionCount: number): number {
  return tagUnionCount > 0 ? sharedTagCount / tagUnionCount : 0;
}

/**
 * 関係性スコア(0〜1)。大きいほど関係性が強い。
 * 入力はすべて 0〜1 に正規化してから重みを掛けるので、
 * 1人のスコアが変わっても他の人のスコアには影響しない(絶対値ベース)。
 */
export function calculateRelationshipScore(me: HomeUser, candidate: HomeCandidate): number {
  const { weights } = GRAVITY_CONFIG;

  const encounterScore = normalizeEncounterCount(candidate.encounterCount);
  const tagScore = tagSimilarity(candidate.sharedTagCount, candidate.tagUnionCount);
  const organizationScore = isSameOrganization(me.organization, candidate.organization) ? 1 : 0;

  return (
    weights.encounter * encounterScore +
    weights.tagSimilarity * tagScore +
    weights.organization * organizationScore
  );
}

/**
 * 候補者全員ぶんのスコアを 0〜1 の「関係の強さ」に変換して返す(userId → strength の Map)。
 * calculateRelationshipScore がすでに 0〜1 の絶対スコアなのでそのまま使う。
 * 1人のスコアが変わっても他の人の strength には影響しない。
 * 半径計算(radius.ts)はこの strength(0〜1)だけを受け取ればよい。
 */
export function calculateStrengths(me: HomeUser, candidates: HomeCandidate[]): Map<string, number> {
  return new Map(candidates.map((c) => [c.userId, calculateRelationshipScore(me, c)]));
}
