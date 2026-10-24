// 丸いボタンとタグ。Figma の各画面の「保存する」「写真選択」「試聴」ボタンとタグの見た目
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { color, ja, radius, typography } from '@/theme/tokens';

type PillButtonProps = {
  title: string;
  onPress: () => void;
  /** primary:青いボタン / secondary:白いボタン */
  variant?: 'primary' | 'secondary';
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PillButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
}: PillButtonProps) {
  const primary = variant === 'primary';
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.secondary,
        primary && inactive && styles.primaryDisabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? color.text.onPrimary : color.text.primary} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text
            style={[
              styles.label,
              primary ? styles.labelPrimary : styles.labelSecondary,
              !primary && inactive && styles.labelDisabled,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** タグ。md:惑星の詳細 / sm:ピン止め一覧のカード */
export function TagChip({
  name,
  size = 'md',
  onPress,
}: {
  name: string;
  size?: 'md' | 'sm';
  onPress?: () => void;
}) {
  const body = (
    <View style={[styles.tag, size === 'sm' && styles.tagSmall]}>
      <Text style={size === 'sm' ? styles.tagTextSmall : styles.tagText} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primary: { backgroundColor: color.bg.primary },
  primaryDisabled: { backgroundColor: color.bg.primaryDisabled, opacity: 0.78 },
  secondary: {
    backgroundColor: color.bg.surface,
    borderWidth: 1,
    borderColor: color.border.secondaryButton,
  },
  pressed: { opacity: 0.8 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: ja(typography.labelButton),
  labelPrimary: { color: color.text.onPrimary },
  labelSecondary: { color: color.text.neutral },
  labelDisabled: { color: color.text.tertiary },
  tag: {
    height: 22,
    paddingHorizontal: 13,
    borderRadius: 13,
    justifyContent: 'center',
    backgroundColor: color.bg.surface,
    borderWidth: 1,
    borderColor: 'rgba(140, 150, 235, 0.38)',
  },
  tagSmall: {
    height: 16,
    paddingHorizontal: 7,
    borderRadius: 8,
    borderWidth: 0.7,
    borderColor: color.border.subtle,
  },
  tagText: { ...ja(typography.labelTag), color: color.text.primary },
  tagTextSmall: { ...ja(typography.labelTagSmall), color: color.text.primary },
});
