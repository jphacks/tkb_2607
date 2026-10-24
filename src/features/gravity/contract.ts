// 引力・描画担当との契約(受け渡しの形)。変えるときは土台担当と引力担当で相談する。
import type { HomeCandidate, HomeUser, UserId } from '@/types/domain';

export type GravityViewProps = {
  /** 中心に出す自分の惑星と衛星 */
  me: HomeUser;
  /** 周りに出す人たち(引力の計算材料つき) */
  candidates: HomeCandidate[];
  /** 惑星がタップされたら呼ぶ。画面移動は土台がやる */
  onPressPlanet: (userId: UserId) => void;
  /**
   * その週に保存済みの角度(userId → ラジアン)。顔ぶれと角度は週に1回(月曜 0:00、日本時間)だけ変わる。
   * null ならその週はまだ計算していないので、角度を計算して onAnglesComputed で渡す。
   * 練習場(lab)などでは渡されない(undefined)ので、そのときはその場で計算して使う。
   */
  angles?: ReadonlyMap<UserId, number> | null;
  /** 角度を計算したら1回だけ呼ぶ。土台がサーバーに保存し、次の週まで angles として渡す */
  onAnglesComputed?: (angles: ReadonlyMap<UserId, number>) => void;
};
