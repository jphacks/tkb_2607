import { router } from 'expo-router';

import { AuthFooterLink, AuthForm } from '@/components/auth-form';
import { signIn } from '@/data';

export default function SignInScreen() {
  return (
    <AuthForm
      submitLabel="ログイン"
      onSubmit={signIn}
      footer={
        <AuthFooterLink
          prompt="アカウントをお持ちでない方は"
          label="新規登録"
          onPress={() => router.push('/sign-up')}
        />
      }
    />
  );
}
