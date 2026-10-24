import { Screen } from '@/components/ui';
import { useSavePlanet } from '@/data';
import { PlanetCreator } from '@/features/photo';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

// 保存すると惑星ができ、_layout の出し分けでホームに進む
export default function SetupPlanetScreen() {
  const savePlanet = useSavePlanet();
  return (
    <Screen>
      <PlanetCreator onComplete={(result) => savePlanet.mutateAsync(result)} />
    </Screen>
  );
}
