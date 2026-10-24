// ホーム左下の「◯ stars nearby」(近くにいる惑星の数)。Figma: B01｜宇宙ホーム 左下のピル
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { color, radius, typography } from '@/theme/tokens';

const planetIcon = require('@/assets/images/home/nearby-planet-icon.png');

export function NearbyCountPill({ count }: { count: number }) {
  return (
    <View style={styles.pill}>
      <Image source={planetIcon} style={styles.icon} contentFit="contain" />
      <Text style={[typography.labelPill, styles.text]}>{count} stars nearby</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // 高さ・余白は Figma の実測値(高さ 27px、アイコン左 12px、アイコンと文字の間 6px、文字の右 13px)
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    height: 27,
    paddingLeft: 12,
    paddingRight: 13,
    gap: 6,
    borderRadius: radius.full,
    backgroundColor: color.bg.surface,
  },
  icon: { width: 21, height: 17 },
  text: { color: color.text.primary },
});
