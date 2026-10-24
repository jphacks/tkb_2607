import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurMask, Canvas, Circle, Group, RadialGradient, vec } from '@shopify/react-native-skia';
import { getRecordingPermissionsAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import ImageColors from 'react-native-image-colors';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Screen } from '@/components/ui';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

// ネイティブ部品チェック:NATIVE_DEPS.md に載っている部品が、今の開発ビルドで動くかを確かめる。
// 担当の機能のコードは使わず、部品を直接呼ぶ(機能が未完成でも確認できるように)。
export default function NativeCheckScreen() {
  return (
    <Screen>
      <Text style={styles.note}>
        上から順にボタンを押して、すべて「OK」になればビルドは正常です。NG
        のときは画面のスクリーンショットを土台担当に送ってください。
      </Text>

      <Section title="Skia(描画)" hint="ぼかしのかかった水彩風の円が見えれば OK">
        <SkiaSample />
      </Section>

      <Section title="Reanimated + Gesture Handler" hint="円をドラッグして、離すと戻れば OK">
        <DragSample />
      </Section>

      <Check title="expo-haptics(振動)" run={hapticsCheck} />
      <PhotoCheck />
      <Check title="expo-file-system(ファイル)" run={fileCheck} />
      <Check title="AsyncStorage(保存)" run={storageCheck} />
      <Check title="expo-audio(音)" run={audioCheck} />
    </Screen>
  );
}

// ---------- 見た目で確かめるもの ----------

function SkiaSample() {
  return (
    <Canvas style={styles.canvas}>
      <Group>
        <Circle cx={80} cy={80} r={56}>
          <RadialGradient c={vec(64, 64)} r={70} colors={['#F4B6C2', '#B5D8EB', '#FFE5A5']} />
          <BlurMask blur={6} style="normal" />
        </Circle>
        <Circle cx={200} cy={80} r={24} color="#7FB3D5">
          <BlurMask blur={3} style="solid" />
        </Circle>
      </Group>
    </Canvas>
  );
}

function DragSample() {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const pan = usePanGesture({
    onUpdate: (event) => {
      'worklet';
      x.value = event.translationX;
      y.value = event.translationY;
    },
    onDeactivate: () => {
      'worklet';
      x.value = withSpring(0);
      y.value = withSpring(0);
    },
  });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));
  return (
    <View style={styles.dragArea}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.dragBall, style]} />
      </GestureDetector>
    </View>
  );
}

// ---------- ボタンで確かめるもの ----------

async function hapticsCheck() {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  return '振動しましたか?(マナーモードでも振動します)';
}

async function fileCheck() {
  const file = new File(Paths.cache, 'native-check.txt');
  const text = `ok ${new Date().toISOString()}`;
  await file.write(text);
  const read = await file.text();
  file.delete();
  if (read !== text) throw new Error(`読み戻した内容が違います: ${read}`);
  return '書き込みと読み戻しができました';
}

async function storageCheck() {
  const value = String(Date.now());
  await AsyncStorage.setItem('native-check', value);
  const read = await AsyncStorage.getItem('native-check');
  await AsyncStorage.removeItem('native-check');
  if (read !== value) throw new Error(`読み戻した内容が違います: ${read}`);
  return '保存と読み戻しができました';
}

async function audioCheck() {
  const permission = await getRecordingPermissionsAsync();
  return `部品を読み込めました(マイクの許可: ${permission.status})`;
}

function PhotoCheck() {
  const [image, setImage] = useState<{ uri: string; colors: string[] } | null>(null);

  const run = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
    if (picked.canceled) return 'キャンセルしました';
    const context = ImageManipulator.manipulate(picked.assets[0].uri);
    context.resize({ width: 256, height: null });
    const saved = await (await context.renderAsync()).saveAsync({ format: SaveFormat.PNG });
    const colors = await ImageColors.getColors(saved.uri, { fallback: '#999999' });
    const palette =
      colors.platform === 'ios'
        ? [colors.primary, colors.secondary, colors.detail, colors.background]
        : [];
    setImage({ uri: saved.uri, colors: palette });
    return `選択・縮小(幅 ${saved.width}px)・色の抽出ができました`;
  };

  return (
    <Check title="写真(image-picker / image-manipulator / image-colors / expo-image)" run={run}>
      {image && (
        <View style={styles.photoRow}>
          <Image source={{ uri: image.uri }} style={styles.photo} contentFit="cover" />
          {image.colors.map((color, i) => (
            <View key={`${color}-${i}`} style={[styles.swatch, { backgroundColor: color }]} />
          ))}
        </View>
      )}
    </Check>
  );
}

// ---------- 部品 ----------

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
      {children}
    </View>
  );
}

type CheckState = { status: 'idle' | 'running' } | { status: 'ok' | 'ng'; message: string };

function Check({
  title,
  run,
  children,
}: {
  title: string;
  run: () => Promise<string>;
  children?: ReactNode;
}) {
  const [state, setState] = useState<CheckState>({ status: 'idle' });

  const onPress = async () => {
    setState({ status: 'running' });
    try {
      setState({ status: 'ok', message: await run() });
    } catch (e) {
      setState({ status: 'ng', message: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <Pressable onPress={onPress} style={styles.button} disabled={state.status === 'running'}>
        <Text style={styles.buttonText}>{state.status === 'running' ? '確認中…' : '試す'}</Text>
      </Pressable>
      {(state.status === 'ok' || state.status === 'ng') && (
        <Text style={state.status === 'ok' ? styles.ok : styles.ng}>
          {state.status === 'ok' ? 'OK' : 'NG'}:{state.message}
        </Text>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { color: '#555', lineHeight: 20 },
  section: { gap: 8, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 12 },
  title: { fontSize: 15, fontWeight: '600' },
  hint: { color: '#666', fontSize: 13 },
  canvas: { height: 160, backgroundColor: '#0B1026', borderRadius: 8 },
  dragArea: { height: 140, alignItems: 'center', justifyContent: 'center' },
  dragBall: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#2E3A87' },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#2E3A87',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  ok: { color: '#1E8449' },
  ng: { color: '#C0392B' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photo: { width: 64, height: 64, borderRadius: 8 },
  swatch: { width: 28, height: 28, borderRadius: 14 },
});
