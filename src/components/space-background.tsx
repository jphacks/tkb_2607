// 宇宙背景のうち、紫のグラデーションだけを描く(ズームしても動かない層)。
// 軌道の点線と星の飾りは SpaceDecorLayer(置き場所の一覧は space-decorations.ts)で、この上に重ねる。
// Figma: tuzuya ページ「B01｜宇宙ホーム 背景レイヤー(ズーム用)」の「背景 / グラデーション(固定)」
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { color } from '@/theme/tokens';

const gradient = require('@/assets/images/home/space-gradient.png');

export function SpaceBackground() {
  return (
    <Image
      source={gradient}
      style={[StyleSheet.absoluteFill, styles.image]}
      contentFit="cover"
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  // 画像の読み込み前に一瞬見える色
  image: { backgroundColor: color.bg.space },
});
