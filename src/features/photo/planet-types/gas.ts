// ガス惑星:横に流れる帯と、ときどき大きな渦。
import { darken, pickColor, toHsl, varyColor } from '../colors';
import { bandPath, between, blobPath, randomPointInCircle } from '../planet-draw';
import type { PlanetType } from './types';

export const gas: PlanetType = {
  id: 'gas',
  label: 'ガス惑星',
  base: ({ brush, palette, cx, cy, radius: r, random, track }) => {
    const count = 7 + Math.floor(random() * 4);
    const height = (r * 2.2) / count;
    const offset = Math.floor(random() * palette.length);
    for (let i = 0; i < count; i++) {
      // 帯どうしを少し重ねて、すき間ができないようにする
      const y0 = cy - r * 1.1 + i * height - height * 0.15;
      const color = varyColor(palette[(i + offset) % palette.length], random, 0.12);
      brush.fill(
        track(bandPath(cx - r * 1.15, cx + r * 1.15, y0, y0 + height * 1.3, r * 0.03, random)),
        color,
      );
    }
    // 大きな渦(ガス惑星の嵐)
    if (random() < 0.7) {
      const p = randomPointInCircle(random, cx, cy, r, 0.6);
      const vivid = pickColor(palette, (c) => toHsl(c).s);
      brush.fill(
        track(blobPath(p.x, p.y, r * between(random, 0.1, 0.16), 0.15, random, 12, 1.8)),
        darken(vivid, 0.1),
        { alpha: 0.8 },
      );
    }
  },
  // 帯は土台の塗り(水彩ではテクスチャ)にあるので、重ねるものはない
  details: () => {},
};
