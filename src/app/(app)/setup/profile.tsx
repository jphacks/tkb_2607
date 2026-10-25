import { ProfileForm } from '@/components/profile-form';
import { Sheet, SpaceScreen } from '@/components/space';

// 保存するとニックネームが入り、_layout の出し分けで次の画面(惑星作成)に進む
export default function SetupProfileScreen() {
  return (
    <SpaceScreen title="プロフィールを登録する" back={false} scroll>
      <Sheet style={{ marginTop: 20 }}>
        <ProfileForm submitLabel="次へ" />
      </Sheet>
    </SpaceScreen>
  );
}
