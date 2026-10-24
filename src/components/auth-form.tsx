import { useState } from 'react';

import { type Credentials } from '@/data';

import { ErrorText, Field, PrimaryButton } from './ui';

export function AuthForm({
  submitLabel,
  onSubmit,
}: {
  submitLabel: string;
  onSubmit: (credentials: Credentials) => Promise<void>;
}) {
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

  return (
    <>
      <Field
        label="メールアドレス"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
      />
      <Field
        label="パスワード(6文字以上)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
      />
      <ErrorText error={error} />
      <PrimaryButton
        title={submitLabel}
        onPress={submit}
        disabled={!email || password.length < 6}
        loading={loading}
      />
    </>
  );
}
