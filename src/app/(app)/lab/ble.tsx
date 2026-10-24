import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Screen } from '@/components/ui';
import {
  startEncounterDetection,
  stopEncounterDetection,
  useEncounterDetectionState,
  useEncounterLog,
} from '@/features/encounter';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

// すれ違い検知の練習場:iPhone 2台でこの画面を開き、近づけて「検知ログ」に相手が出るかを見る。
// 検知はログイン後に自動で始まる。ここでは止めたり再開したりできる。
export default function BleLabScreen() {
  const detection = useEncounterDetectionState();
  const log = useEncounterLog();

  if (!detection.available) {
    return (
      <Screen>
        <Text style={styles.warning}>
          この開発ビルドには BLE
          モジュールが入っていません。3回目以降のビルドを入れてください(NATIVE_DEPS.md)。
        </Text>
      </Screen>
    );
  }

  const status = detection.status;
  return (
    <Screen>
      <Text style={styles.note}>
        2台とも Bluetooth をオンにして、この画面を開いたまま近づける(1m
        くらい)。片方をホーム画面に戻したり画面ロックしたりして、バックグラウンドでも検知できるかも試す。
      </Text>

      <View style={styles.section}>
        <Text style={styles.heading}>状態</Text>
        <Row label="動作中" value={status?.running ? 'はい' : 'いいえ'} />
        <Row label="Bluetooth の許可" value={status?.authorization ?? '-'} />
        <Row label="受信側(相手を探す)" value={status?.central ?? '-'} />
        <Row label="発信側(自分を知らせる)" value={status?.peripheral ?? '-'} />
        <Row label="スキャン中" value={status?.scanning ? 'はい' : 'いいえ'} />
        <Row label="広告中" value={status?.advertising ? 'はい' : 'いいえ'} />
        <Row label="接続して読み取り中" value={String(status?.connecting ?? 0)} />
        <Row label="自分の一時ID" value={detection.myToken ?? '-'} />
        <Row label="送信待ちの報告" value={String(detection.pendingReports)} />
        {detection.error && <Text style={styles.warning}>{detection.error}</Text>}
      </View>

      {status?.running ? (
        <PrimaryButton title="検知を止める" onPress={() => void stopEncounterDetection()} />
      ) : (
        <PrimaryButton title="検知を始める" onPress={() => void startEncounterDetection()} />
      )}

      <View style={styles.section}>
        <Text style={styles.heading}>検知ログ(サーバーへの報告結果)</Text>
        {log.length === 0 && <Text style={styles.note}>まだ検知していません</Text>}
        {log.map((entry) => (
          <Text key={entry.id} style={styles.mono}>
            {new Date(entry.detectedAt).toLocaleTimeString()} {entry.token} RSSI {entry.rssi} →{' '}
            {entry.result}
          </Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>ネイティブのログ</Text>
        {detection.nativeLogs.map((entry) => (
          <Text key={entry.id} style={styles.mono}>
            {new Date(entry.at).toLocaleTimeString()} {entry.message}
          </Text>
        ))}
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { color: '#666', fontSize: 13 },
  warning: { color: '#c00' },
  section: { gap: 6 },
  heading: { fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { color: '#666' },
  value: { fontFamily: 'Menlo', flexShrink: 1, textAlign: 'right' },
  mono: { fontFamily: 'Menlo', fontSize: 12 },
});
