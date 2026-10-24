// 画面ごとのエラー受け止め。画面のファイルで次のように書くと、その画面が落ちてもアプリ全体は落ちない。
//   export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';
import { router, type ErrorBoundaryProps } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { PrimaryButton, Screen } from './ui';

export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <Screen>
      <Text style={styles.title}>この画面でエラーが起きました</Text>
      <Text style={styles.message}>{error.message}</Text>
      <PrimaryButton title="もう一度試す" onPress={() => retry()} />
      {router.canGoBack() && <PrimaryButton title="前の画面に戻る" onPress={() => router.back()} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '600' },
  message: { fontFamily: 'Menlo', fontSize: 12, color: '#C0392B' },
});
