import { AuthForm } from '@/components/auth-form';
import { Screen } from '@/components/ui';
import { signUp } from '@/data';

export default function SignUpScreen() {
  return (
    <Screen>
      <AuthForm submitLabel="登録する" onSubmit={signUp} />
    </Screen>
  );
}
