// 自分の惑星と衛星(衛星の登録・効果音・惑星をつくる画面の上半分)
import { StyleSheet, View } from 'react-native';

import { useMyProfile, useMySatellites } from '@/data';

import { PlanetOrbit } from './planet-orbit';
import { Sparkle } from './space';

export function MyPlanetHero({
  satellites = 'all',
  sizeScale,
  onPressPlanet,
}: {
  /** all:登録した衛星すべて / featured:ホームに出す衛星だけ */
  satellites?: 'all' | 'featured';
  /** 保存前の惑星の大きさを試しに見せる。省略時は保存済みの大きさ */
  sizeScale?: number;
  onPressPlanet?: () => void;
}) {
  const { data: profile } = useMyProfile();
  const { data: mine } = useMySatellites();
  const list = (mine ?? []).filter((s) => satellites === 'all' || s.isFeatured);
  const saved = profile?.planet ?? null;
  const planet = saved && sizeScale !== undefined ? { ...saved, sizeScale } : saved;

  return (
    <View style={styles.hero}>
      <PlanetOrbit
        planet={planet}
        satellites={list}
        size="md"
        swipeable
        onPressPlanet={onPressPlanet}
      />
      <Sparkle x={30} y={40} size={18} />
      <Sparkle x={56} y={0} size={24} />
      <Sparkle x={98} y={14} size={12} />
      <Sparkle x={325} y={170} size={18} />
      <Sparkle x={345} y={138} size={26} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 28, marginBottom: 24 },
});
