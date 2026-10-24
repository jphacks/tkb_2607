// 海の惑星:海の上に大陸があり、白い雲が流れる。
import { darken, hueScore, lighten, mixColors, pickColor, varyColor } from '../colors';
import { between, blobPath, circlePath, randomPointInCircle } from '../planet-draw';
import type { PlanetType } from './types';

/** 写真に海・陸らしい色がないときに混ぜる色 */
const SEA = '#2E6FA8';
const LAND = '#5E8C4A';
const CLOUD = '#FFFFFF';
/** この強さより弱い色しかなければ、海・陸らしい色を混ぜる */
const WEAK_COLOR = 0.15;

export const ocean: PlanetType = {
  id: 'ocean',
  label: '海の惑星',
  base: ({ brush, palette, cx, cy, radius: r, track }) => {
    const bluest = pickColor(palette, (c) => hueScore(c, 215));
    const sea = hueScore(bluest, 215) < WEAK_COLOR ? mixColors(bluest, SEA, 0.5) : bluest;
    brush.fill(track(circlePath(cx, cy, r * 1.1)), darken(sea, 0.05));
  },
  details: ({ brush, palette, cx, cy, radius: r, random, track }) => {
    const greenest = pickColor(palette, (c) => hueScore(c, 115));
    const land = hueScore(greenest, 115) < WEAK_COLOR ? mixColors(greenest, LAND, 0.5) : greenest;

    // 大陸
    const continents = 3 + Math.floor(random() * 3);
    for (let i = 0; i < continents; i++) {
      const p = randomPointInCircle(random, cx, cy, r, 0.8);
      const size = r * between(random, 0.2, 0.38);
      brush.fill(
        track(blobPath(p.x, p.y, size, 0.35, random, 14, between(random, 1, 1.4))),
        varyColor(land, random, 0.1),
      );
      // 大陸の中の、少し明るいところ
      brush.fill(track(blobPath(p.x, p.y, size * 0.5, 0.3, random)), lighten(land, 0.15), {
        alpha: 0.6,
      });
    }

    // 横長の雲
    const clouds = 4 + Math.floor(random() * 3);
    for (let i = 0; i < clouds; i++) {
      const p = randomPointInCircle(random, cx, cy, r, 0.9);
      brush.fill(
        track(blobPath(p.x, p.y, r * between(random, 0.06, 0.12), 0.3, random, 10, 2.2)),
        CLOUD,
        { alpha: 0.75, soft: true },
      );
    }
  },
};
