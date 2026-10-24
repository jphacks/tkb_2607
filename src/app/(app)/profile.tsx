import { router } from 'expo-router';

import { ProfileForm } from '@/components/profile-form';
import { PrimaryButton, Screen } from '@/components/ui';
import { signOut } from '@/data';

export default function ProfileScreen() {
  return (
    <Screen>
      <ProfileForm submitLabel="保存" onSaved={() => router.back()} />
      <PrimaryButton title="惑星をつくりなおす" onPress={() => router.push('/planet/create')} />
      {/* ホームの右上から移動ボタンをなくしたので、衛星とラボへの入口はここに置く */}
      <PrimaryButton title="衛星" onPress={() => router.push('/satellites')} />
      <PrimaryButton title="ラボ" onPress={() => router.push('/lab')} />
      <PrimaryButton title="ログアウト" onPress={() => signOut()} />
    </Screen>
  );
}
