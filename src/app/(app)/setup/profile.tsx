import { ProfileForm } from '@/components/profile-form';
import { Screen } from '@/components/ui';

// 保存するとニックネームが入り、_layout の出し分けで次の画面(惑星作成)に進む
export default function SetupProfileScreen() {
  return (
    <Screen>
      <ProfileForm submitLabel="次へ" />
    </Screen>
  );
}
