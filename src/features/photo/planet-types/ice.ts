// 氷の惑星:明るく冷たい色に、白い極冠(北と南の氷)と細いひび。
import { darken, hueScore, lighten, mixColors, pickColor } from '../colors';
import {
  bandPath,
  between,
  blobPath,
  circlePath,
  crackPath,
  randomPointInCircle,
} from '../planet-draw';
import type { PlanetType, PlanetTypeContext } from './types';

/** 氷らしい色(写真の寒色に混ぜる) */
const ICE = '#BFE3F2';
const SNOW = '#FFFFFF';

function iceColor(palette: string[]): string {
  const cool = pickColor(palette, (c) => hueScore(c, 210));
  return lighten(mixColors(cool, ICE, 0.4), 0.35);
}

export const ice: PlanetType = {
  id: 'ice',
  label: '氷の惑星',
  base: ({ brush, palette, cx, cy, radius: r, random, track }: PlanetTypeContext) => {
    const base = iceColor(palette);
    brush.fill(track(circlePath(cx, cy, r * 1.1)), base);
    // うっすらとした帯
    for (let i = 0; i < 4; i++) {
      const y = cy - r * 0.6 + i * r * 0.35;
      brush.fill(
        track(bandPath(cx - r * 1.15, cx + r * 1.15, y, y + r * 0.12, r * 0.03, random)),
        lighten(base, 0.25),
        { alpha: 0.5 },
      );
    }
  },
  details: ({ brush, palette, cx, cy, radius: r, random, track }) => {
    // 白い極冠
    brush.fill(
      track(blobPath(cx, cy - r * 0.95, r * between(random, 0.5, 0.65), 0.12, random, 14, 1.4)),
      SNOW,
      { alpha: 0.92 },
    );
    brush.fill(
      track(blobPath(cx, cy + r * 0.97, r * between(random, 0.35, 0.5), 0.12, random, 14, 1.4)),
      SNOW,
      { alpha: 0.85 },
    );
    // 細いひび
    const crack = darken(iceColor(palette), 0.3);
    for (let i = 0; i < 6; i++) {
      const p = randomPointInCircle(random, cx, cy, r, 0.8);
      brush.stroke(
        track(crackPath(p.x, p.y, r * between(random, 0.3, 0.7), random() * Math.PI * 2, random)),
        crack,
        r * 0.012,
        { alpha: 0.6 },
      );
    }
  },
};
