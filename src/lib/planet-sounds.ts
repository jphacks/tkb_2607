// 惑星の効果音。音はアプリに同梱している(assets/sounds/、外部素材を使わずに合成した自作の音)。
// 音を増やすときは、ここに1行足すだけでよい(DB は ID を保存するだけなので変更不要)。
// ID は英小文字・数字・_ の32文字まで(DB の check 制約)。
import type { SoundId } from '@/types/domain';

export type PlanetSound = {
  id: SoundId;
  /** 画面に出す名前 */
  label: string;
  source: number;
};

export const PLANET_SOUNDS: PlanetSound[] = [
  { id: 'pow', label: 'ポウ！', source: require('@/assets/sounds/pow.wav') },
  { id: 'kyururun', label: 'キュルルン！', source: require('@/assets/sounds/kyururun.wav') },
  { id: 'kirarin', label: 'キラリン', source: require('@/assets/sounds/kirarin.wav') },
  { id: 'pyon', label: 'ピョン', source: require('@/assets/sounds/pyon.wav') },
  { id: 'poyon', label: 'ポヨン', source: require('@/assets/sounds/poyon.wav') },
  { id: 'shararan', label: 'シャララン', source: require('@/assets/sounds/shararan.wav') },
];

/** アプリに入っていない ID(古いアプリで消えた音など)なら null */
export const findPlanetSound = (id: SoundId | null) =>
  PLANET_SOUNDS.find((s) => s.id === id) ?? null;
