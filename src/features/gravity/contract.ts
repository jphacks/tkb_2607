// 引力・描画担当との契約(受け渡しの形)。変えるときは土台担当と引力担当で相談する。
import type { HomeCandidate, HomeUser, UserId } from '@/types/domain';

export type GravityViewProps = {
  /** 中心に出す自分の惑星と衛星 */
  me: HomeUser;
  /** 周りに出す人たち(引力の計算材料つき) */
  candidates: HomeCandidate[];
  /** 惑星がタップされたら呼ぶ。画面移動は土台がやる */
  onPressPlanet: (userId: UserId) => void;
};
