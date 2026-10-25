import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { MyPlanetHero } from '@/components/my-planet-hero';
import { MoreButton, Sheet, SpaceScreen } from '@/components/space';
import { useAddSatellite } from '@/data';
import { SatelliteCreator } from '@/features/photo';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

// 衛星の登録。Figma: C01|衛星登録写真
// 写真を選んで切り抜く部分(カードの中身)は写真担当の SatelliteCreator。見た目は写真担当が作り替える
export default function AddSatelliteScreen() {
  const add = useAddSatellite();
  return (
    <SpaceScreen
      title="衛星を登録する"
      subtitle={'好きな写真を選んで、\n背景を透過して衛星にしましょう。'}
      headerRight={<MoreButton />}
      scroll
    >
      <MyPlanetHero />
      <Sheet style={styles.sheet}>
        <SatelliteCreator
          onComplete={async (result) => {
            await add.mutateAsync(result);
            router.back();
          }}
        />
      </Sheet>
    </SpaceScreen>
  );
}

const styles = StyleSheet.create({
  sheet: { minHeight: 300 },
});
