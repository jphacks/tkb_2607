// ホームの宇宙背景(グラデーション・軌道の点線・星の飾り)。
// Figma の B01｜宇宙ホームから、データで変わる部分(惑星・ラベル・衛星・ボタン)を除いて1枚の画像に書き出したもの。
// 金属の星は Figma のシェーダー(Web 専用の描画)なので、書き出した結果をそのまま使っている。
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { color } from '@/theme/tokens';

const background = require('@/assets/images/home/space-background.png');

export function SpaceBackground() {
  return (
    <Image
      source={background}
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
