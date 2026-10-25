// 角度を「顔ぶれが変わったときだけ」計算し直すフック。
// 顔ぶれが変わるのは週次更新だけで、30分ごとの更新では半径(距離)しか変わらない。
// そのため、半径が変わっても同じ顔ぶれなら前回の角度をそのまま使い、惑星は同じ方向のまま近づく・遠ざかる。
// 保存先はメモリだけなので、アプリを再起動するとその時点の半径で計算し直す(保存先は土台担当と相談)。
import { useState } from 'react';

import type { UserId } from '@/types/domain';

import { calculateAngles, type RadiusAt } from './angular-layout';
import type { AngularMode } from './config';

type FrozenAngles = { key: string; angles: Map<UserId, number> };

/** 顔ぶれ(userId の集合)・角度の決め方・variant が同じなら同じ文字列になる */
function membersKey(strengths: Map<UserId, number>, mode: string, variant: string): string {
  return `${mode}:${variant}:${[...strengths.keys()].sort().join(',')}`;
}

const EMPTY: Map<UserId, number> = new Map();

/**
 * strengths(userId → 強さ)と radiusAt(方向ごとの距離)から角度を計算し、顔ぶれが変わるまで使い回す。
 * enabled が false のあいだは計算しない(保存済みの角度があるときなど)。そのあいだは空の Map を返す。
 * variant:練習場で配置の設定(rankBlend など)を切り替えたときに、計算し直すための文字列
 */
export function useFrozenAngles(
  strengths: Map<UserId, number>,
  radiusAt: RadiusAt,
  mode?: AngularMode,
  enabled = true,
  variant = '',
): Map<UserId, number> {
  const key = membersKey(strengths, mode ?? 'default', variant);
  const [frozen, setFrozen] = useState<FrozenAngles>(() =>
    enabled
      ? { key, angles: calculateAngles(strengths, radiusAt, mode) }
      : { key: '', angles: EMPTY },
  );

  if (!enabled) return EMPTY;
  if (frozen.key !== key) {
    // 描画中に state を更新して、顔ぶれが変わったその回の描画から新しい角度を使う(React 公式の書き方)
    const next = { key, angles: calculateAngles(strengths, radiusAt, mode) };
    setFrozen(next);
    return next.angles;
  }
  return frozen.angles;
}
