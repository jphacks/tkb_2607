import { router } from 'expo-router';

import { AuthFooterLink, AuthForm } from '@/components/auth-form';
import { signUp } from '@/data';

export default function SignUpScreen() {
  return (
    <AuthForm
      submitLabel="登録する"
      onSubmit={signUp}
      footer={
        <AuthFooterLink
          prompt="アカウントをお持ちの方は"
          label="ログイン"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))}
        />
      }
    />
  );
}
