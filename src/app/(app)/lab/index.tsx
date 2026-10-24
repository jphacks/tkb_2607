import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/ui';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

// 動作確認ラボ:各担当が、他の人の作業を待たずに自分の部分を実機で試すための入口。
// 練習場の画面は自由に追加してよい(このファイルの LINKS に1行足す)。
const LINKS: { href: Href; title: string; description: string }[] = [
  {
    href: '/lab/native',
    title: 'ネイティブ部品チェック',
    description:
      '開発ビルドに入っている部品が動くかを1つずつ試す(新しいビルドを入れたら最初に開く)',
  },
  {
    href: '/lab/gravity',
    title: '引力の練習場',
    description: '固定の見本データで GravityView を表示する。人数を変えて試せる',
  },
  {
    href: '/lab/photo',
    title: '写真の練習場',
    description: '惑星・衛星づくりを試す。結果を見るだけで保存はしない',
  },
  {
    href: '/debug',
    title: 'デバッグ',
    description: 'データのモード、デモ操作、すれ違い検知ログ',
  },
];

export default function LabScreen() {
  return (
    <Screen>
      {LINKS.map((link) => (
        <Pressable key={link.title} onPress={() => router.push(link.href)} style={styles.card}>
          <Text style={styles.title}>{link.title}</Text>
          <Text style={styles.description}>{link.description}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, gap: 4 },
  title: { fontSize: 16, fontWeight: '600' },
  description: { color: '#666', fontSize: 13 },
});
