import { Link } from 'expo-router';

import { AuthForm } from '@/components/auth-form';
import { Screen } from '@/components/ui';
import { signIn } from '@/data';

export default function SignInScreen() {
  return (
    <Screen>
      <AuthForm submitLabel="ログイン" onSubmit={signIn} />
      <Link href="/sign-up">はじめての方は新規登録</Link>
    </Screen>
  );
}
