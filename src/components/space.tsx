// 宇宙の背景の画面(ホーム以外)の共通部品。Figma: tuzuya ページ「完成」セクションの各画面
// - 背景:Gradient/Space Background(中心が濃い紫の放射グラデーション)
// - ヘッダー:「← Back」と右上の丸いボタン、その下に画面タイトルと説明
import { Image } from 'expo-image';
import { router, useRootNavigationState } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, gradient, ja, layout, radius, shadow, space, typography } from '@/theme/tokens';

const metalStar = require('@/assets/images/ui/metal-star.png');

/** 画面いっぱいの宇宙の背景 */
export function SpaceBackdrop() {
  return <View style={[StyleSheet.absoluteFill, styles.backdrop]} pointerEvents="none" />;
}

/**
 * 前の画面に戻る「← Back」ボタン。戻る操作はこのボタンだけにする(スワイプで戻る操作は切ってある)。
 * 戻る先がない画面(最初の画面など)では何も出さない
 */
export function BackButton() {
  // router.canGoBack() は、画面を開いた直後の描画ではまだ移動前の状態を見て false を返す。
  // 描画中の画面遷移の状態から、戻る先があるかを調べる
  const canGoBack = hasHistory(useRootNavigationState());
  if (!canGoBack) return null;
  return (
    <Pressable
      onPress={() => router.back()}
      style={styles.back}
      accessibilityRole="button"
      accessibilityLabel="戻る"
      hitSlop={8}
    >
      <Text style={styles.backArrow}>←</Text>
      <Text style={styles.backLabel}>Back</Text>
    </Pressable>
  );
}

type NavState = { type?: string; index?: number; routes?: { state?: NavState }[] };

/** 今開いている画面までのどこかの Stack に、1つ前の画面があるか */
function hasHistory(state: NavState | undefined): boolean {
  if (!state?.routes?.length) return false;
  const index = state.index ?? state.routes.length - 1;
  // タブなどの index は「何番目のタブを開いているか」で、戻る先ではないので Stack だけ数える
  const isStack = state.type === undefined || state.type === 'stack';
  return (isStack && index > 0) || hasHistory(state.routes[index]?.state);
}

/** ぼんやり光る白い星(飾り)。x・y は画面の左上からの位置 */
export function Sparkle({ x, y, size = 18 }: { x: number; y: number; size?: number }) {
  return (
    <Text
      style={[styles.sparkle, { left: x, top: y, fontSize: size, lineHeight: size * 1.2 }]}
      pointerEvents="none"
    >
      ✦
    </Text>
  );
}

/** 金属の星(飾り)。Figma ではシェーダーで描いているので、書き出した画像を使う */
export function MetalStar({ x, y, height = 80 }: { x: number; y: number; height?: number }) {
  // 書き出した画像は星の周りに余白がある(150 × 273 のうち星は 99 × 155)
  const scale = height / 155;
  return (
    <Image
      source={metalStar}
      style={{
        position: 'absolute',
        left: x - 25 * scale,
        top: y - 59 * scale,
        width: 150 * scale,
        height: 273 * scale,
      }}
      contentFit="contain"
      pointerEvents="none"
    />
  );
}

/** 右上の丸い「•••」ボタン */
export function MoreButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={styles.more}
      accessibilityRole="button"
      accessibilityLabel="メニュー"
      hitSlop={8}
    >
      <Text style={styles.moreText}>•••</Text>
    </Pressable>
  );
}

type SpaceScreenProps = {
  title?: string;
  subtitle?: string;
  /** タイトルの右隣(件数など) */
  titleAside?: ReactNode;
  /** タイトル行の右端(切り替えスイッチなど) */
  titleRight?: ReactNode;
  /** ヘッダーの右端(「•••」ボタンなど) */
  headerRight?: ReactNode;
  /** 戻るボタンを出すか(前の画面がないときは出さない) */
  back?: boolean;
  /** 背景の飾り(星など)。中身より奥に描く */
  decor?: ReactNode;
  /** true なら中身をスクロールできるようにする(入力欄がある画面など) */
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function SpaceScreen({
  title,
  subtitle,
  titleAside,
  titleRight,
  headerRight,
  back = true,
  decor,
  scroll = false,
  contentStyle,
  children,
}: SpaceScreenProps) {
  const insets = useSafeAreaInsets();

  const header = (
    <View style={{ paddingTop: insets.top + 6 }}>
      <View style={styles.headerRow}>
        {/* Back がなくても右上のボタンが右に寄るよう、左側の枠は残す */}
        <View>{back && <BackButton />}</View>
        {headerRight}
      </View>
      {title !== undefined && (
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <View style={styles.titleLeft}>
              <Text style={styles.title}>{title}</Text>
              {titleAside}
            </View>
            {titleRight}
          </View>
          {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <SpaceBackdrop />
      {decor}
      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[{ paddingBottom: insets.bottom + space.lg }, contentStyle]}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, { paddingBottom: insets.bottom }, contentStyle]}>
          {header}
          {children}
        </View>
      )}
    </View>
  );
}

/** 白い角丸のカード(画面下の操作パネル)。Figma: Planet profile card */
export function Sheet({
  children,
  tone = 'white',
  style,
}: {
  children: ReactNode;
  /** mist:ログインと惑星作成の、少し灰色がかったカード */
  tone?: 'white' | 'mist';
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.sheet, tone === 'mist' && styles.sheetMist, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.space },
  fill: { flex: 1 },
  backdrop: gradient.space,
  sparkle: {
    position: 'absolute',
    color: color.icon.onDark,
    textShadowColor: color.icon.onDark,
    textShadowRadius: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenX,
    minHeight: 28,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backArrow: {
    ...typography.navBack,
    fontFamily: typography.titleSection.fontFamily,
    fontSize: 20,
    color: color.text.onDark,
  },
  backLabel: { ...typography.navBack, color: color.text.onDark },
  more: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: color.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadow.sm,
  },
  moreText: { ...typography.labelButton, color: color.text.primary, letterSpacing: -1 },
  titleBlock: { paddingHorizontal: layout.screenX, marginTop: 16, gap: 7 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 12, flexShrink: 1 },
  title: { ...ja(typography.titleScreen), color: color.text.onDark },
  subtitle: { ...ja(typography.bodySmall), color: color.text.onDark },
  sheet: {
    marginHorizontal: layout.sheetInset,
    padding: layout.sheetPadding,
    borderRadius: radius.sheet,
    backgroundColor: 'rgba(255, 255, 255, 0.93)',
    borderWidth: 1,
    borderColor: 'rgba(140, 150, 235, 0.32)',
    boxShadow: shadow.sheet,
  },
  sheetMist: { backgroundColor: 'rgba(245, 244, 249, 0.93)' },
});
