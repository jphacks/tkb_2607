// パステル:明るめの色で、ふちをこすったようにぼかして塗る。やわらかい粉っぽさ。
import { BlendMode, Skia } from '@shopify/react-native-skia';

import { lighten, lightestColor } from '../colors';
import { between, clipped, createRandom, drawGrain, makePaint } from '../planet-draw';
import type { PlanetStyle } from './types';

export const pastel: PlanetStyle = {
  id: 'pastel',
  label: 'パステル',
  edgeWobble: 0.01,
  edgeSoftness: 3.5,
  createBrush: (canvas, size, palette, seed, track) => {
    const random = createRandom(seed + 53);
    const soften = (color: string) => lighten(color, 0.3);
    const groundColor = lighten(lightestColor(palette.map(soften)), 0.5);

    return {
      ground: (area) => canvas.drawPath(area, makePaint(track, { color: groundColor })),

      fill: (path, color, options = {}) => {
        const alpha = options.alpha ?? 1;
        const soft = soften(color);
        canvas.drawPath(
          path,
          makePaint(track, {
            color: soft,
            alpha: alpha * 0.75,
            blur: size * (options.soft ? 0.03 : 0.014),
          }),
        );
        // 指でこすったような筋を、横向きに数本
        clipped(canvas, path, () => {
          const b = path.getBounds();
          const count = 3 + Math.round((5 * b.height) / size);
          for (let i = 0; i < count; i++) {
            const y = b.y + random() * b.height;
            const line = Skia.PathBuilder.Make().moveTo(b.x - 10, y);
            for (let x = b.x; x <= b.x + b.width + 10; x += Math.max(20, b.width / 4)) {
              line.lineTo(x, y + (random() - 0.5) * size * 0.03);
            }
            canvas.drawPath(
              track(line.build()),
              makePaint(track, {
                color: lighten(soft, 0.25),
                alpha: alpha * 0.35,
                stroke: size * between(random, 0.03, 0.06),
                blur: size * 0.02,
              }),
            );
          }
        });
      },

      stroke: (path, color, width, options = {}) =>
        canvas.drawPath(
          path,
          makePaint(track, {
            color: soften(color),
            alpha: (options.alpha ?? 1) * 0.8,
            stroke: width * 1.3,
            blur: size * (options.soft ? 0.025 : 0.008),
          }),
        ),

      // 粉っぽさ:明るい粒と、下地の色の粒
      texture: (area) =>
        clipped(canvas, area, () => {
          drawGrain(canvas, track, area, {
            seed,
            grainSize: 1.3,
            threshold: 0.6,
            softness: 0.3,
            color: '#FFFFFF',
            alpha: 0.45,
            blend: BlendMode.Screen,
          });
          drawGrain(canvas, track, area, {
            seed: seed + 7,
            grainSize: 2.2,
            threshold: 0.75,
            softness: 0.2,
            color: groundColor,
            alpha: 0.3,
            blend: BlendMode.SrcOver,
          });
        }),
    };
  },
};
