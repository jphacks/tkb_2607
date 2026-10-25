import { PlanetCreateScreen } from '@/components/planet-create-screen';
import { useSavePlanet } from '@/data';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

// 保存すると惑星ができ、_layout の出し分けでホームに進む
export default function SetupPlanetScreen() {
  const savePlanet = useSavePlanet();
  return (
    <PlanetCreateScreen back={false} onComplete={(result) => savePlanet.mutateAsync(result)} />
  );
}
