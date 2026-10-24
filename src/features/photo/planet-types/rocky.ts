// 岩の惑星:落ち着いた色の地面に、クレーター。
import { darken, lighten, mixColors, varyColor } from '../colors';
import { between, blobPath, circlePath, randomPointInCircle } from '../planet-draw';
import type { PlanetType } from './types';

/** 岩らしい灰色(写真の色に混ぜる) */
const STONE = '#8A8580';

function groundColor(palette: string[]): string {
  return darken(mixColors(palette[0], STONE, 0.55), 0.1);
}

export const rocky: PlanetType = {
  id: 'rocky',
  label: '岩の惑星',
  base: ({ brush, palette, cx, cy, radius: r, random, track }) => {
    const base = groundColor(palette);
    brush.fill(track(circlePath(cx, cy, r * 1.1)), base);
    // 地面のまだら
    for (let i = 0; i < 6; i++) {
      const p = randomPointInCircle(random, cx, cy, r, 0.9);
      brush.fill(
        track(blobPath(p.x, p.y, r * between(random, 0.15, 0.32), 0.3, random)),
        varyColor(base, random, 0.15),
        { alpha: 0.6 },
      );
    }
  },
  // クレーター:暗いくぼみと、光が当たる左上が明るい縁
  details: ({ brush, palette, cx, cy, radius: r, random, track }) => {
    const base = groundColor(palette);
    const craters = 8 + Math.floor(random() * 6);
    for (let i = 0; i < craters; i++) {
      const p = randomPointInCircle(random, cx, cy, r, 0.85);
      const size = r * between(random, 0.04, 0.15);
      brush.fill(track(circlePath(p.x, p.y, size)), darken(base, 0.28), { alpha: 0.85 });
      brush.stroke(
        track(circlePath(p.x - size * 0.12, p.y - size * 0.12, size)),
        lighten(base, 0.25),
        size * 0.22,
        { alpha: 0.7 },
      );
    }
  },
};
