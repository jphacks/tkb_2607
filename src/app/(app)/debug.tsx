import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui';
import { env } from '@/config/env';
import { useDemoAddEncounter, useDemoResetHomeLineup, useDummyUsers } from '@/data';
import { useEncounterLog } from '@/features/encounter';

// 検知ログ(BLE の検証用)と、デモ操作(EXPO_PUBLIC_DEMO_MODE=true のときだけ)
export default function DebugScreen() {
  const log = useEncounterLog();
  return (
    <Screen>
      <Text style={styles.meta}>
        データ: {env.dataMode} / デモモード: {env.demoMode ? 'ON' : 'OFF'}
      </Text>
      {env.demoMode && <DemoSection />}
      <Text style={styles.heading}>すれ違い検知ログ</Text>
      {log.length === 0 && <Text style={styles.meta}>まだ検知していません</Text>}
      {log.map((entry) => (
        <Text key={entry.id} style={styles.log}>
          {new Date(entry.detectedAt).toLocaleTimeString()} {entry.token} RSSI {entry.rssi} →{' '}
          {entry.result}
        </Text>
      ))}
    </Screen>
  );
}

function DemoSection() {
  const { data: dummies } = useDummyUsers();
  const addEncounter = useDemoAddEncounter();
  const resetLineup = useDemoResetHomeLineup();
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>デモ:ホームの顔ぶれ</Text>
      <Text style={styles.meta}>
        顔ぶれと角度は週に1回(月曜
        0:00)だけ選び直す。ダミーや新しい人を足したあとは、これで今すぐ選び直す。
      </Text>
      <Pressable
        onPress={() => resetLineup.mutate()}
        style={styles.row}
        disabled={resetLineup.isPending}
      >
        <Text>顔ぶれを今すぐ選び直す</Text>
        <Text>{resetLineup.isSuccess ? '済み' : ''}</Text>
      </Pressable>

      <Text style={styles.heading}>デモ:ダミーとのすれ違い +1</Text>
      <Text style={styles.meta}>
        今週の顔ぶれに入っている人なら、押すとホームの半径にすぐ反映される(本物のすれ違いは30分ごとに反映)。顔ぶれにいない人は、上の「選び直す」を押すと入る。
      </Text>
      {dummies?.map((d) => (
        <Pressable
          key={d.userId}
          onPress={() => addEncounter.mutate(d.userId)}
          style={styles.row}
          disabled={addEncounter.isPending}
        >
          <Text>{d.nickname}</Text>
          <Text>{d.encounterCount} 回 +1</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  meta: { color: '#666' },
  heading: { fontSize: 16, fontWeight: '600' },
  section: { gap: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  log: { fontFamily: 'Menlo', fontSize: 12 },
});
