// パステル:明るめの色で、太くやわらかい線をこすったように重ねる。粉っぽい粒を少し。
import { BlendMode, Skia } from '@shopify/react-native-skia';

import { lighten, lightestColor } from '../colors';
import { bandColor, createRandom, drawGrain, makePaint, withDisposables } from './common';
import type { PlanetStyle } from './types';

const STROKE_COUNT = 40;

export const pastel: PlanetStyle = {
  id: 'pastel',
  label: 'パステル',
  draw: (canvas, palette, size, seed) =>
    withDisposables((track) => {
      const random = createRandom(seed);
      const center = size / 2;
      const soft = palette.map((color) => lighten(color, 0.3));

      // 下地
      canvas.drawPaint(makePaint(track, { color: lighten(lightestColor(soft), 0.5) }));

      // 指でこすったように、ぼかした太い線を横向きに重ねる
      canvas.save();
      canvas.rotate(-12 + random() * 24, center, center);
      for (let i = 0; i < STROKE_COUNT; i++) {
        const y = -size * 0.1 + random() * size * 1.2;
        const builder = Skia.PathBuilder.Make().moveTo(-size * 0.1, y);
        for (let x = 0; x <= size * 1.2; x += size * 0.3) {
          builder.lineTo(x - size * 0.1, y + (random() - 0.5) * size * 0.05);
        }
        canvas.drawPath(
          track(builder.build()),
          makePaint(track, {
            color: bandColor(soft, (y + size * 0.1) / (size * 1.2), random),
            alpha: 0.5,
            stroke: size * (0.06 + random() * 0.04),
            blur: size * 0.02,
          }),
        );
      }
      canvas.restore();

      // 粉っぽさ:明るい粒と、下地の色の粒
      drawGrain(canvas, track, size, {
        seed,
        grainSize: 1.3,
        threshold: 0.6,
        softness: 0.3,
        color: '#FFFFFF',
        alpha: 0.45,
        blend: BlendMode.Screen,
      });
      drawGrain(canvas, track, size, {
        seed: seed + 7,
        grainSize: 2.2,
        threshold: 0.75,
        softness: 0.2,
        color: lightestColor(soft),
        alpha: 0.3,
        blend: BlendMode.SrcOver,
      });
    }),
};
