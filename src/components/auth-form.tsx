// ログイン・新規登録の画面。Figma: A02|ログイン
// Google / Apple でのログインはまだないので、ボタンは見た目だけ(押すと「準備中」と出す)
import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Credentials } from '@/data';
import { color, ja, typography } from '@/theme/tokens';

import { PillButton } from './pill';
import { LOGO_ASPECT } from './splash';
import { Sheet, SpaceBackdrop } from './space';
import { ErrorText } from './ui';

const logo = require('@/assets/images/ui/logo.png');
const decor = require('@/assets/images/ui/login-decor.png');
const googleLogo = require('@/assets/images/ui/google-logo.png');
const appleLogo = require('@/assets/images/ui/apple-logo.png');
const chevron = require('@/assets/images/ui/chevron.png');

export function AuthForm({
  submitLabel,
  onSubmit,
  footer,
}: {
  submitLabel: string;
  onSubmit: (credentials: Credentials) => Promise<void>;
  /** カードの一番下(「新規登録」へのリンクなど) */
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ email: email.trim(), password });
    } catch (e) {
      setError(e);
      setLoading(false);
    }
  };

  const comingSoon = () =>
    Alert.alert('準備中です', 'いまはメールアドレスでログインしてください。');

  return (
    <View style={styles.root}>
      <SpaceBackdrop />
      <Image source={decor} style={styles.decor} contentFit="contain" pointerEvents="none" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image source={logo} style={styles.logo} contentFit="contain" />
        <Sheet tone="mist" style={styles.sheet}>
          <Input
            placeholder="メールアドレス"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
          />
          <Input
            placeholder="パスワード(6文字以上)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />
          <ErrorText error={error} />
          <PillButton
            title={submitLabel}
            onPress={submit}
            disabled={!email || password.length < 6}
            loading={loading}
            style={styles.submit}
          />
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerLabel}>または</Text>
            <View style={styles.line} />
          </View>
          <SocialButton icon={googleLogo} label="Googleでログイン" onPress={comingSoon} />
          <SocialButton icon={appleLogo} label="Appleでログイン" onPress={comingSoon} />
          {footer}
        </Sheet>
      </ScrollView>
    </View>
  );
}

function Input(props: TextInputProps) {
  return (
    <TextInput
      style={styles.input}
      placeholderTextColor="rgba(46, 28, 158, 0.38)"
      autoCapitalize="none"
      {...props}
    />
  );
}

function SocialButton({
  icon,
  label,
  onPress,
}: {
  icon: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.social} accessibilityRole="button">
      <View style={styles.socialCenter}>
        <Image source={icon} style={styles.socialIcon} contentFit="contain" />
        <Text style={styles.socialLabel}>{label}</Text>
      </View>
      <Image source={chevron} style={styles.chevron} contentFit="contain" />
    </Pressable>
  );
}

/** カードの一番下の「◯◯の方は ◯◯」のリンク */
export function AuthFooterLink({
  prompt,
  label,
  onPress,
}: {
  prompt: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerPrompt}>{prompt}</Text>
      <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8}>
        <Text style={styles.footerLink}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.space },
  decor: { position: 'absolute', top: 0, left: 0, width: '100%', aspectRatio: 1191 / 792 },
  content: { flexGrow: 1, justifyContent: 'flex-end' },
  logo: {
    width: '100%',
    maxWidth: 397,
    aspectRatio: LOGO_ASPECT,
    alignSelf: 'center',
    marginTop: 160,
  },
  sheet: { gap: 13, paddingHorizontal: 15, paddingTop: 26, marginTop: 8 },
  input: {
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 24,
    backgroundColor: color.bg.surface,
    borderWidth: 1,
    borderColor: 'rgba(186, 178, 219, 0.65)',
    ...ja(typography.titleItem),
    color: '#2E1C9E',
  },
  submit: { marginTop: 2 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(199, 191, 224, 0.65)' },
  dividerLabel: { ...ja(typography.bodyXSmall), color: '#614D94' },
  social: {
    height: 52,
    borderRadius: 26,
    backgroundColor: color.bg.surface,
    borderWidth: 1,
    borderColor: 'rgba(186, 178, 219, 0.65)',
    justifyContent: 'center',
  },
  socialCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  socialIcon: { width: 25, height: 25 },
  socialLabel: { ...ja(typography.titleItem), color: '#2E1C9E' },
  chevron: { position: 'absolute', right: 18, width: 16, height: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 2 },
  footerPrompt: { ...ja(typography.bodyXSmall), color: '#5C4A9E' },
  footerLink: { ...ja(typography.bodyXSmall), color: '#4F36AD', textDecorationLine: 'underline' },
});
