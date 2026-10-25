// 起動画面。読み込みの待ち時間に出す。Figma: A01|起動画面
import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { color } from '@/theme/tokens';

import { SpaceBackdrop } from './space';

const logo = require('@/assets/images/ui/logo.png');

/** ロゴの画像の縦横比(書き出しは 1191 × 669) */
export const LOGO_ASPECT = 1191 / 669;

export function Splash() {
  return (
    <View style={styles.root}>
      <SpaceBackdrop />
      <Image source={logo} style={styles.logo} contentFit="contain" />
      <ActivityIndicator style={styles.spinner} color={color.text.onDarkMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.bg.space,
  },
  logo: { width: '100%', maxWidth: 397, aspectRatio: LOGO_ASPECT },
  spinner: { position: 'absolute', bottom: 80 },
});
