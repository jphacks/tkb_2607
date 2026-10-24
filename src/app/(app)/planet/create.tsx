import { router } from 'expo-router';

import { Screen } from '@/components/ui';
import { useSavePlanet } from '@/data';
import { PlanetCreator } from '@/features/photo';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

export default function PlanetCreateScreen() {
  const savePlanet = useSavePlanet();
  return (
    <Screen>
      <PlanetCreator
        onComplete={async (result) => {
          await savePlanet.mutateAsync(result);
          router.back();
        }}
      />
    </Screen>
  );
}
