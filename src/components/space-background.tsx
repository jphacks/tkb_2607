// 宇宙背景のうち、紫のグラデーションだけを描く(ズームしても動かない層)。
// 軌道の点線と星の飾りは SpaceDecorLayer(置き場所の一覧は space-decorations.ts)で、この上に重ねる。
// Figma: tuzuya ページ「B01｜宇宙ホーム 背景レイヤー(ズーム用)」の「背景 / グラデーション(固定)」
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { color } from '@/theme/tokens';

import { SPACE_GRADIENT, useSpaceAssets } from './space-assets';

export function SpaceBackground() {
  // 起動中に読み込み済みの画像を使う(ホームを開いた瞬間に出る)。まだなら通常どおり読み込む
  const gradient = useSpaceAssets()?.gradient ?? SPACE_GRADIENT;
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
