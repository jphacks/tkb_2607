// 練習場(src/app/(app)/lab)用の固定データ。データ層を通さず、すぐに描画を試すためのもの。
// mock / supabase のどちらのモードでも同じ中身になる。
import type { HomeCandidate, HomeData } from '@/types/domain';

import { DUMMY_FIXTURES, ME_FIXTURE } from './mock/fixtures';

const HOUR = 60 * 60 * 1000;

/** ホームと同じ形のデータを、指定した人数ぶん作る(ダミー12人を超えた分は色違いで増やす) */
export function getSampleHome(count: number): HomeData {
  const now = Date.now();
  const myTags = new Set(ME_FIXTURE.tags);

  const candidates: HomeCandidate[] = Array.from({ length: count }, (_, i) => {
    const base = DUMMY_FIXTURES[i % DUMMY_FIXTURES.length];
    const round = Math.floor(i / DUMMY_FIXTURES.length);
    const shared = base.tags.filter((t) => myTags.has(t)).length;
    const encounterTimestamps = Array.from({ length: base.encounterCount }, (__, k) =>
      new Date(now - (k + 1) * 6 * HOUR).toISOString(),
    );
    return {
      userId: `sample-${i + 1}`,
      nickname: round === 0 ? base.nickname : `${base.nickname}${round + 1}`,
      planet: { imageUrl: null, palette: base.palette },
      featuredSatellites: [],
      sharedTagCount: shared,
      tagUnionCount: new Set([...base.tags, ...myTags]).size,
      encounterCount: base.encounterCount,
      lastEncounterAt: encounterTimestamps[0] ?? null,
      encounterTimestamps,
    };
  });

  return {
    me: {
      userId: ME_FIXTURE.id,
      nickname: ME_FIXTURE.nickname,
      planet: { imageUrl: null, palette: ME_FIXTURE.palette },
      featuredSatellites: [],
    },
    candidates,
    lineup: { periodStart: '2026-10-18T15:00:00.000Z', angles: null },
  };
}
