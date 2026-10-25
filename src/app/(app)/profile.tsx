import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PillButton } from '@/components/pill';
import { ProfileForm } from '@/components/profile-form';
import { Sheet, SpaceScreen } from '@/components/space';
import { signOut } from '@/data';
import { layout, space } from '@/theme/tokens';

// プロフィールの編集と、惑星・衛星・効果音などの設定への入口
export default function ProfileScreen() {
  return (
    <SpaceScreen title="プロフィール" scroll>
      <Sheet style={styles.sheet}>
        <ProfileForm submitLabel="保存する" onSaved={() => router.back()} />
      </Sheet>
      <View style={styles.menu}>
        <PillButton
          variant="secondary"
          title="衛星をえらぶ・追加する"
          onPress={() => router.push('/satellites')}
        />
        <PillButton
          variant="secondary"
          title="惑星の効果音"
          onPress={() => router.push('/sound')}
        />
        <PillButton
          variant="secondary"
          title="ピン止めした星"
          onPress={() => router.push('/pins')}
        />
        <PillButton
          variant="secondary"
          title="惑星をつくりなおす"
          onPress={() => router.push('/planet/create')}
        />
        <PillButton
          variant="secondary"
          title="ラボ(動作確認)"
          onPress={() => router.push('/lab')}
        />
        <PillButton variant="secondary" title="ログアウト" onPress={() => signOut()} />
      </View>
    </SpaceScreen>
  );
}

const styles = StyleSheet.create({
  sheet: { marginTop: 20 },
  menu: { marginTop: space.xl, marginHorizontal: layout.sheetInset, gap: space.md },
});
