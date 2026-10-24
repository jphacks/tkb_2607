// 引力の描画。スコア計算(scoring.ts)・半径マッピング(radius.ts)・角度の決定(angular-layout.ts)は切り出し済み。
// ここは座標変換と描画のみを担当する。惑星1つぶんの見た目は土台の PlanetNode を使う。
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { PlanetNode } from '@/components/planet-node';
import type { UserId } from '@/types/domain';

import type { GravityViewProps } from './contract';
import { GRAVITY_CONFIG, type AngularMode } from './config';
import { calculateMaxRadius, mapStrengthToRadius } from './radius';
import { calculateStrengths } from './scoring';
import { useFrozenAngles } from './use-frozen-angles';

const { planetSize: PLANET_SIZE, mePlanetSize: ME_PLANET_SIZE } = GRAVITY_CONFIG.layout;

type Props = GravityViewProps & {
  /** 角度の決め方。練習場で見比べるためのもの(契約外)。省略時は config.ts の値 */
  angularMode?: AngularMode;
};

export function GravityView({
  me,
  candidates,
  onPressPlanet,
  angles: savedAngles,
  onAnglesComputed,
  angularMode,
}: Props) {
  // 最初は画面サイズで仮に置き、実際の表示領域(ヘッダーがある画面では少し低い)が分かったら置き直す
  const windowSize = useWindowDimensions();
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const { width, height } = area ?? windowSize;
  const cx = width / 2;
  const cy = height / 2;

  const maxRadius = calculateMaxRadius(width, height);
  const strengths = calculateStrengths(me, candidates);
  const radii = new Map(
    candidates.map((c) => [c.userId, mapStrengthToRadius(strengths.get(c.userId) ?? 0, maxRadius)]),
  );

  // 角度は週に1回だけ決める。保存済み(savedAngles)があればそれを使い、
  // なければ(null)ここで計算して onAnglesComputed で土台に渡す。練習場など undefined のときはその場で計算する
  const computedAngles = useFrozenAngles(radii, angularMode);
  const angles: ReadonlyMap<UserId, number> = savedAngles ?? computedAngles;

  const reported = useRef<ReadonlyMap<UserId, number> | null>(null);
  useEffect(() => {
    if (savedAngles !== null || !onAnglesComputed) return;
    if (reported.current === computedAngles) return;
    reported.current = computedAngles;
    onAnglesComputed(computedAngles);
  }, [savedAngles, computedAngles, onAnglesComputed]);

  return (
    <View
      style={styles.space}
      onLayout={(e) =>
        setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
      }
    >
      {candidates.map((c) => {
        const r = radii.get(c.userId) ?? maxRadius;
        // 保存済みの角度にいない人(念のため)は、その場で計算した角度を使う
        const angle = angles.get(c.userId) ?? computedAngles.get(c.userId) ?? 0;
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
            <PlanetNode
              planet={c.planet}
              size={PLANET_SIZE}
              label={c.nickname}
              showLabel={c.encounterCount >= GRAVITY_CONFIG.labelMinEncounters}
            />
          </Pressable>
        );
      })}
      <Pressable
        onPress={() => onPressPlanet(me.userId)}
        style={[styles.planet, { left: cx - ME_PLANET_SIZE / 2, top: cy - ME_PLANET_SIZE / 2 }]}
      >
        <PlanetNode
          planet={me.planet}
          size={ME_PLANET_SIZE}
          label="You"
          isMe
          satellites={me.featuredSatellites}
        />
      </Pressable>
    </View>
  );
}

// 背景(宇宙)はホーム画面側で描くので、ここは透明にする
const styles = StyleSheet.create({
  space: { flex: 1, overflow: 'hidden' },
  planet: { position: 'absolute' },
});
