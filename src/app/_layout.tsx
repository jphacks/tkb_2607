import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Loading } from '@/components/ui';
import { AuthProvider, queryClient, useAuth } from '@/data';

function RootNavigator() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading />;

  // ログイン状態で見られる画面を切り替える。
  // 起動直後は「/」(ホーム)を開こうとし、未ログインなら最初に見られる画面(sign-in)へ送られる。
  // sign-in をグループ (auth) に入れると「/」の送り先がなくなり Unmatched route になるので、ここに直接置く。
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" options={{ headerShown: true, title: 'ログイン' }} />
        <Stack.Screen name="sign-up" options={{ headerShown: true, title: '新規登録' }} />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
