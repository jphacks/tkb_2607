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

/**
 * 仮のスコア:すれ違い回数(最優先) + 共通タグの割合(次点) + 所属団体の一致(3番目)。
 * 所属団体は正式名称で入力してもらう前提で、前後の空白・大文字小文字だけそろえて比較する。
 */
function tentativeScore(
  encounterCount: number,
  sharedTagCount: number,
  tagUnionCount: number,
  sameOrganization: boolean,
) {
  const jaccard = tagUnionCount > 0 ? sharedTagCount / tagUnionCount : 0;
  return encounterCount + jaccard * 5 + (sameOrganization ? 2 : 0);
}

function normalizeOrganization(value: string | null): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

function isSameOrganization(mine: string | null, theirs: string | null): boolean {
  const a = normalizeOrganization(mine);
  const b = normalizeOrganization(theirs);
  return a !== null && b !== null && a === b;
}

export function GravityView({ me, candidates, onPressPlanet }: GravityViewProps) {
  const { width, height } = useWindowDimensions();
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.min(width, height) / 2 - PLANET_SIZE;
  const scoreOf = (c: (typeof candidates)[number]) =>
    tentativeScore(
      c.encounterCount,
      c.sharedTagCount,
      c.tagUnionCount,
      isSameOrganization(me.organization, c.organization),
    );
  const maxScore = Math.max(1, ...candidates.map(scoreOf));

  return (
    <View style={styles.space}>
      {candidates.map((c, i) => {
        const score = scoreOf(c);
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
