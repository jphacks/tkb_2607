// 水彩:ぼかした色の塊を薄く重ねてにじませる。紙のざらつきを少し。
import { BlendMode } from '@shopify/react-native-skia';

import { darken, lighten, lightestColor } from '../colors';
import {
  blobPath,
  createRandom,
  drawGrain,
  makePaint,
  planetRadius,
  randomPointInPlanet,
  withDisposables,
} from './common';
import type { PlanetStyle } from './types';

const BLOB_COUNT = 18;

export const watercolor: PlanetStyle = {
  id: 'watercolor',
  label: '水彩',
  draw: (canvas, palette, size, seed) =>
    withDisposables((track) => {
      const random = createRandom(seed);
      const radius = planetRadius(size);

      // 紙の色:いちばん明るい色を白に寄せる
      canvas.drawPaint(makePaint(track, { color: lighten(lightestColor(palette), 0.75) }));

      for (let i = 0; i < BLOB_COUNT; i++) {
        const color = palette[i % palette.length];
        const { x, y } = randomPointInPlanet(random, size, 0.95);
        const blob = track(blobPath(x, y, radius * (0.25 + random() * 0.35), 0.25, random));
        // 乗算で重ねると、重なったところが絵の具のように濃くなる
        canvas.drawPath(
          blob,
          makePaint(track, {
            color,
            alpha: 0.28 + random() * 0.15,
            blend: BlendMode.Multiply,
            blur: size * (0.015 + random() * 0.03),
          }),
        );
        // 水がたまって少し濃くなったふち
        canvas.drawPath(
          blob,
          makePaint(track, {
            color: darken(color, 0.2),
            alpha: 0.16,
            blend: BlendMode.Multiply,
            stroke: size * 0.006,
            blur: size * 0.004,
          }),
        );
      }

      // 紙のざらつき
      drawGrain(canvas, track, size, {
        seed,
        grainSize: 1.5,
        threshold: 0.45,
        softness: 0.5,
        color: '#5A5040',
        alpha: 0.12,
        blend: BlendMode.Multiply,
      });
    }),
};
