// 惑星をつくる画面の枠。Figma: 惑星の作成
// 写真を選んで惑星にする部分(カードの中身)は写真担当の PlanetCreator。見た目は写真担当が作り替える
import { StyleSheet, View } from 'react-native';

import { PlanetCreator, type PlanetCreatorProps } from '@/features/photo';

import { Sheet, SpaceScreen } from './space';

export function PlanetCreateScreen({
  back,
  onComplete,
}: {
  back: boolean;
  onComplete: PlanetCreatorProps['onComplete'];
}) {
  return (
    <SpaceScreen
      title="あなただけの惑星を作成"
      subtitle={'あなたらしい画像を選び、\nあなただけの惑星を作成しましょう。'}
      back={back}
      scroll
    >
      {/* まだ惑星がない状態の、ぼんやりした光 */}
      <View style={styles.glowArea} pointerEvents="none">
        <View style={styles.glow} />
      </View>
      <Sheet tone="mist" style={styles.sheet}>
        <PlanetCreator onComplete={onComplete} />
      </Sheet>
    </SpaceScreen>
  );
}

const styles = StyleSheet.create({
  glowArea: { height: 260, alignItems: 'center', justifyContent: 'center' },
  glow: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundImage: 'radial-gradient(circle closest-side, #B5B1D5 55%, rgba(181,177,213,0) 100%)',
  },
  sheet: { minHeight: 300 },
});
