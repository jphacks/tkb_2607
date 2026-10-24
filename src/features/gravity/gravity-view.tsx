// 【仮実装】土台が動作確認のために置いたもの。引力・描画担当が中身を作り替える。
// スコア計算(scoring.ts)・半径マッピング(radius.ts)・角度の決定(angular-layout.ts)は切り出し済み。
// ここは座標変換と描画のみを担当する。
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { Planet } from '@/types/domain';

import type { GravityViewProps } from './contract';
import { GRAVITY_CONFIG, type AngularMode } from './config';
import { calculateMaxRadius, mapStrengthToRadius } from './radius';
import { calculateStrengths } from './scoring';
import { useFrozenAngles } from './use-frozen-angles';

const PLANET_SIZE = GRAVITY_CONFIG.layout.planetSize;

function PlanetDot({ planet, size }: { planet: Planet | null; size: number }) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (planet?.imageUrl) {
    return <Image source={{ uri: planet.imageUrl }} style={style} contentFit="cover" />;
  }
  return <View style={[style, { backgroundColor: planet?.palette[0] ?? '#999' }]} />;
}

type Props = GravityViewProps & {
  /** 角度の決め方。練習場で見比べるためのもの(契約外)。省略時は config.ts の値 */
  angularMode?: AngularMode;
};

export function GravityView({ me, candidates, onPressPlanet, angularMode }: Props) {
  const { width, height } = useWindowDimensions();
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = calculateMaxRadius(width, height);
  const strengths = calculateStrengths(me, candidates);
  const radii = new Map(
    candidates.map((c) => [c.userId, mapStrengthToRadius(strengths.get(c.userId) ?? 0, maxRadius)]),
  );
  // 角度は顔ぶれが変わったとき(週次更新)だけ計算し直す。30分ごとの更新では半径だけが変わる
  const angles = useFrozenAngles(radii, angularMode);

  return (
    <View style={styles.space}>
      {candidates.map((c) => {
        const r = radii.get(c.userId) ?? maxRadius;
        const angle = angles.get(c.userId) ?? 0;
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
