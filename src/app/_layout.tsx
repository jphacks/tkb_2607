import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeOut } from 'react-native-reanimated';

import { preloadSpaceAssets } from '@/components/space-assets';
import { Splash } from '@/components/splash';
import { AuthProvider, queryClient, useAuth } from '@/data';
import { appFonts } from '@/theme/fonts';

function RootNavigator() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Splash />;

  // ログイン状態で見られる画面を切り替える。
  // 起動直後は「/」(ホーム)を開こうとし、未ログインなら最初に見られる画面(sign-in)へ送られる。
  // sign-in をグループ (auth) に入れると「/」の送り先がなくなり Unmatched route になるので、ここに直接置く。
  // 前の画面へ戻るのは「← Back」ボタンだけにする(画面の端からのスワイプでは戻らない)
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

/** 起動画面(ロゴ)を最低でもこの時間は見せる。読み込みが早く終わっても一瞬で消えないようにする */
const SPLASH_MIN_MS = 1500;

export default function RootLayout() {
  // フォントの読み込みに失敗したときは、端末の標準フォントで表示を続ける
  const [fontsLoaded, fontError] = useFonts(appFonts);
  // 宇宙背景の画像も先に読み込む(ホームで、紫だけが出て後から星が出るのを防ぐ)。失敗しても先へ進む
  const [spaceReady, setSpaceReady] = useState(false);
  const [splashTimeUp, setSplashTimeUp] = useState(false);

  useEffect(() => {
    preloadSpaceAssets().finally(() => setSpaceReady(true));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSplashTimeUp(true), SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  if ((!fontsLoaded && !fontError) || !spaceReady) return <Splash />;

  // 裏ではログイン状態やプロフィールの読み込みを進め、ロゴを上に重ねておく。時間が来たらふわっと消す
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
      {!splashTimeUp && (
        <Animated.View style={StyleSheet.absoluteFill} exiting={FadeOut.duration(400)}>
          <Splash />
        </Animated.View>
      )}
    </GestureHandlerRootView>
  );
}
