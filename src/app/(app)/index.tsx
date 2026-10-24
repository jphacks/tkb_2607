import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NearbyCountPill } from '@/components/nearby-count-pill';
import { SpaceBackground } from '@/components/space-background';
import { ErrorText, Loading, PrimaryButton, Screen } from '@/components/ui';
import { useHome, useSaveHomeAngles } from '@/data';
import { GravityView } from '@/features/gravity';
import { color, radius, space } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

const pinIcon = require('@/assets/images/home/pin-icon.png');
const bellIcon = require('@/assets/images/home/bell-icon.png');

// ホーム。引力の描画(GravityView)は引力・描画担当の差し込み口。背景・右上のボタン・左下のピルは土台が描く
// Figma: tuzuya ページ「完成」セクションの B01｜宇宙ホーム
export default function HomeScreen() {
  const { data, error, refetch } = useHome(20);
  const insets = useSafeAreaInsets();
  const saveAngles = useSaveHomeAngles();
  // 同じ週の角度は1回だけ保存する(保存に失敗して取り直しても、何度も送らないように)
  const savedPeriod = useRef<string | null>(null);

  if (!data) {
    return error ? (
      <Screen>
        <ErrorText error={error} />
        <PrimaryButton title="再読み込み" onPress={() => refetch()} />
      </Screen>
    ) : (
      <Loading />
    );
  }

  return (
    <View style={styles.container}>
      <SpaceBackground />
      <GravityView
        me={data.me}
        candidates={data.candidates}
        onPressPlanet={(userId) =>
          // 自分の惑星はプロフィール(衛星・ラボへの入口もここ)、他の人は惑星の詳細へ
          userId === data.me.userId
            ? router.push('/profile')
            : router.push({ pathname: '/planet/[userId]', params: { userId } })
        }
        angles={data.lineup.angles}
        onAnglesComputed={(angles) => {
          const { periodStart } = data.lineup;
          if (savedPeriod.current === periodStart) return;
          savedPeriod.current = periodStart;
          saveAngles.mutate({ periodStart, angles });
        }}
      />
      {/* ピン止め一覧・お知らせの画面はまだないので、今は見た目だけ。画面ができたら Pressable にする */}
      <View style={[styles.actions, { top: insets.top + space.sm }]} pointerEvents="none">
        <View style={styles.roundButton}>
          <Image source={pinIcon} style={styles.pinIcon} contentFit="contain" />
        </View>
        <View style={styles.roundButton}>
          <Image source={bellIcon} style={styles.bellIcon} contentFit="contain" />
        </View>
      </View>
      <View style={styles.nearby} pointerEvents="none">
        <NearbyCountPill count={data.candidates.length} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Figma の位置(右 17px、ボタン同士の間 11px)。上はノッチの下から少し空ける
  actions: { position: 'absolute', right: 17, flexDirection: 'row', gap: 11 },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: color.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinIcon: { width: 18, height: 18 },
  bellIcon: { width: 47 / 3, height: 61 / 3 },
  // Figma の位置(左 21px、下 32px)
  nearby: { position: 'absolute', left: 21, bottom: space['2xl'] },
});
