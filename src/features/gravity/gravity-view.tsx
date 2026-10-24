// 【仮実装】土台が動作確認のために置いたもの。引力・描画担当が中身を作り替える。
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { PlanetNode } from '@/components/planet-node';

import type { GravityViewProps } from './contract';
import { CANDIDATE_SLOTS, fitDesign, ME_SLOT, type PlanetSlot } from './home-layout';

/** 仮のスコア:すれ違い回数 + 共通タグの割合 */
function tentativeScore(encounterCount: number, sharedTagCount: number, tagUnionCount: number) {
  const jaccard = tagUnionCount > 0 ? sharedTagCount / tagUnionCount : 0;
  return encounterCount + jaccard * 5;
}

export function GravityView({ me, candidates, onPressPlanet }: GravityViewProps) {
  // 最初は画面サイズで仮に置き、実際の表示領域(ヘッダーがある画面では少し低い)が分かったら置き直す
  const windowSize = useWindowDimensions();
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const { width, height } = area ?? windowSize;
  const { scale, offsetX, offsetY } = fitDesign(width, height);

  // デザインの座標(中心と直径)を、画面上の箱(左上と直径)に直す
  const place = (slot: PlanetSlot) => {
    const size = slot.size * scale;
    return {
      size,
      left: offsetX + slot.x * scale - size / 2,
      top: offsetY + slot.y * scale - size / 2,
    };
  };

  // スコアが高い人ほど自分に近い場所に置く。場所の数より多い人は出さない
  const ranked = [...candidates]
    .sort(
      (a, b) =>
        tentativeScore(b.encounterCount, b.sharedTagCount, b.tagUnionCount) -
        tentativeScore(a.encounterCount, a.sharedTagCount, a.tagUnionCount),
    )
    .slice(0, CANDIDATE_SLOTS.length);

  const mePos = place(ME_SLOT);

  return (
    <View
      style={styles.space}
      onLayout={(e) =>
        setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
      }
    >
      {ranked.map((c, i) => {
        const slot = CANDIDATE_SLOTS[i];
        const { size, left, top } = place(slot);
        return (
          <Pressable
            key={c.userId}
            onPress={() => onPressPlanet(c.userId)}
            style={[styles.planet, { left, top }]}
          >
            <PlanetNode planet={c.planet} size={size} label={c.nickname} showLabel={slot.labeled} />
          </Pressable>
        );
      })}
      <Pressable
        onPress={() => onPressPlanet(me.userId)}
        style={[styles.planet, { left: mePos.left, top: mePos.top }]}
      >
        <PlanetNode
          planet={me.planet}
          size={mePos.size}
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
