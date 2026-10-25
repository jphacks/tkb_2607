// 惑星の効果音を鳴らすフック。返ってくる関数に音の ID を渡すと鳴る。
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect } from 'react';

import type { SoundId } from '@/types/domain';

import { findPlanetSound } from './planet-sounds';

export function usePlanetSoundPlayer() {
  const player = useAudioPlayer(null);

  useEffect(() => {
    // iPhone のマナーモード(消音)中でも鳴らす。失敗しても音が鳴らないだけなので無視する
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  /** 鳴らせたら true。音を選んでいない・アプリにない音なら false */
  return useCallback(
    (id: SoundId | null) => {
      const sound = findPlanetSound(id);
      if (!sound) return false;
      player.replace(sound.source);
      player.play();
      return true;
    },
    [player],
  );
}
