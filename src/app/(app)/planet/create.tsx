import { router } from 'expo-router';

import { PlanetCreateScreen } from '@/components/planet-create-screen';
import { useSavePlanet } from '@/data';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

export default function PlanetCreateRoute() {
  const savePlanet = useSavePlanet();
  return (
    <PlanetCreateScreen
      back
      onComplete={async (result) => {
        await savePlanet.mutateAsync(result);
        router.back();
      }}
    />
  );
}
