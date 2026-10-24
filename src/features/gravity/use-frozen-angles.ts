// 角度を「顔ぶれが変わったときだけ」計算し直すフック。
// 顔ぶれが変わるのは週次更新だけで、30分ごとの更新では半径(距離)しか変わらない。
// そのため、半径が変わっても同じ顔ぶれなら前回の角度をそのまま使い、惑星は同じ方向のまま近づく・遠ざかる。
// 保存先はメモリだけなので、アプリを再起動するとその時点の半径で計算し直す(保存先は土台担当と相談)。
import { useState } from 'react';

import type { UserId } from '@/types/domain';

import { calculateAngles } from './angular-layout';
import type { AngularMode } from './config';

type FrozenAngles = { key: string; angles: Map<UserId, number> };

/** 顔ぶれ(userId の集合)と角度の決め方が同じなら同じ文字列になる */
function membersKey(radii: Map<UserId, number>, mode: string): string {
  return `${mode}:${[...radii.keys()].sort().join(',')}`;
}

export function useFrozenAngles(
  radii: Map<UserId, number>,
  mode?: AngularMode,
): Map<UserId, number> {
  const key = membersKey(radii, mode ?? 'default');
  const [frozen, setFrozen] = useState<FrozenAngles>(() => ({
    key,
    angles: calculateAngles(radii, mode),
  }));

  if (frozen.key !== key) {
    // 描画中に state を更新して、顔ぶれが変わったその回の描画から新しい角度を使う(React 公式の書き方)
    const next = { key, angles: calculateAngles(radii, mode) };
    setFrozen(next);
    return next.angles;
  }
  return frozen.angles;
}
