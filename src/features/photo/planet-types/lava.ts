// 溶岩の惑星:暗く固まった岩の上に、光る筋・ひびが走る。
import { darken, hueScore, lighten, mixColors, pickColor, varyColor } from '../colors';
import { between, blobPath, circlePath, crackPath, randomPointInCircle } from '../planet-draw';
import type { PlanetType } from './types';

/** 溶岩らしい光の色(写真の暖色に混ぜる) */
const MAGMA = '#FF6A1A';
/** 冷えて固まった岩の色(写真の色に混ぜる) */
const CRUST = '#2B1B17';

export const lava: PlanetType = {
  id: 'lava',
  label: '溶岩の惑星',
  base: ({ brush, palette, cx, cy, radius: r, random, track }) => {
    const crust = mixColors(palette[palette.length - 1], CRUST, 0.65);
    brush.fill(track(circlePath(cx, cy, r * 1.1)), crust);
    // 固まった岩のまだら
    for (let i = 0; i < 5; i++) {
      const p = randomPointInCircle(random, cx, cy, r, 0.85);
      brush.fill(
        track(blobPath(p.x, p.y, r * between(random, 0.15, 0.3), 0.3, random)),
        varyColor(darken(crust, 0.2), random, 0.1),
        { alpha: 0.7 },
      );
    }
  },
  // 光る筋:ぼかした太い線の上に、明るく細い線を重ねる
  details: ({ brush, palette, cx, cy, radius: r, random, track }) => {
    const warm = pickColor(palette, (c) => hueScore(c, 20));
    const glow = lighten(mixColors(warm, MAGMA, 0.45), 0.1);
    const core = lighten(glow, 0.45);
    const count = 6 + Math.floor(random() * 3);
    for (let i = 0; i < count; i++) {
      const p = randomPointInCircle(random, cx, cy, r, 0.9);
      const crack = track(
        crackPath(p.x, p.y, r * between(random, 0.5, 1.1), random() * Math.PI * 2, random),
      );
      brush.stroke(crack, glow, r * 0.06, { soft: true, alpha: 0.6 });
      brush.stroke(crack, core, r * 0.018);
    }
  },
};
