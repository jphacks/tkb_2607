// 【仮実装】土台が動作確認のために置いたもの。引力・描画担当が中身を作り替える。
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { Planet } from '@/types/domain';

import type { GravityViewProps } from './contract';

const PLANET_SIZE = 56;

function PlanetDot({ planet, size }: { planet: Planet | null; size: number }) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (planet?.imageUrl) {
    return <Image source={{ uri: planet.imageUrl }} style={style} contentFit="cover" />;
  }
  return <View style={[style, { backgroundColor: planet?.palette[0] ?? '#999' }]} />;
}

/** 仮のスコア:すれ違い回数 + 共通タグの割合 */
function tentativeScore(encounterCount: number, sharedTagCount: number, tagUnionCount: number) {
  const jaccard = tagUnionCount > 0 ? sharedTagCount / tagUnionCount : 0;
  return encounterCount + jaccard * 5;
}

export function GravityView({ me, candidates, onPressPlanet }: GravityViewProps) {
  const { width, height } = useWindowDimensions();
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.min(width, height) / 2 - PLANET_SIZE;
  const maxScore = Math.max(
    1,
    ...candidates.map((c) => tentativeScore(c.encounterCount, c.sharedTagCount, c.tagUnionCount)),
  );

  return (
    <View style={styles.space}>
      {candidates.map((c, i) => {
        const score = tentativeScore(c.encounterCount, c.sharedTagCount, c.tagUnionCount);
        const r = PLANET_SIZE * 1.5 + (1 - score / maxScore) * (maxRadius - PLANET_SIZE * 1.5);
        const angle = (i / candidates.length) * Math.PI * 2;
        return (
          <Pressable
            key={c.userId}
            onPress={() => onPressPlanet(c.userId)}
            style={[
              styles.planet,
              {
                left: cx + r * Math.cos(angle) - PLANET_SIZE / 2,
                top: cy + r * Math.sin(angle) - PLANET_SIZE / 2,
              },
            ]}
          >
            <PlanetDot planet={c.planet} size={PLANET_SIZE} />
            <Text style={styles.label}>{c.nickname}</Text>
          </Pressable>
        );
      })}
      <View style={[styles.planet, { left: cx - PLANET_SIZE, top: cy - PLANET_SIZE }]}>
        <PlanetDot planet={me.planet} size={PLANET_SIZE * 2} />
        <Text style={styles.label}>{me.nickname}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  space: { flex: 1, backgroundColor: '#0B1026' },
  planet: { position: 'absolute', alignItems: 'center' },
  label: { color: '#fff', fontSize: 11, marginTop: 4 },
});
