// クレヨン:斜めの線で塗り、細かい粒でかすれさせる。ふちはがたつき、塗り残しが少し見える。
import { BlendMode, Skia } from '@shopify/react-native-skia';

import { lighten, lightestColor } from '../colors';
import {
  bandColor,
  createRandom,
  drawGrain,
  makePaint,
  planetRadius,
  withDisposables,
} from './common';
import type { PlanetStyle } from './types';

/** 線と線の間隔(キャンバスに対する割合)。線の太さより少し広いので、すき間に紙が見える */
const LINE_GAP = 0.02;

export const crayon: PlanetStyle = {
  id: 'crayon',
  label: 'クレヨン',
  draw: (canvas, palette, size, seed) =>
    withDisposables((track) => {
      const random = createRandom(seed);
      const center = size / 2;

      // 紙の色(塗り残しから見える)
      canvas.drawPaint(makePaint(track, { color: lighten(lightestColor(palette), 0.85) }));

      // クレヨンの線だけを別の層に描き、あとで粒の形に削る(削れたところから紙が見える)
      canvas.saveLayer();
      canvas.save();
      canvas.rotate(-35 + random() * 70, center, center);
      for (let y = -size * 0.2; y < size * 1.2; y += size * LINE_GAP) {
        const color = bandColor(palette, (y + size * 0.2) / (size * 1.4), random);
        // 手で引いたように、線を少しうねらせる
        const builder = Skia.PathBuilder.Make().moveTo(-size * 0.2, y);
        for (let x = 0; x <= size * 1.4; x += size * 0.2) {
          builder.lineTo(x - size * 0.2, y + (random() - 0.5) * size * 0.012);
        }
        canvas.drawPath(
          track(builder.build()),
          makePaint(track, {
            color,
            alpha: 0.9,
            stroke: size * LINE_GAP * (0.75 + random() * 0.35),
          }),
        );
      }
      canvas.restore();
      drawGrain(canvas, track, size, {
        seed,
        grainSize: 1.6,
        threshold: 0.62,
        softness: 0.12,
        color: '#000000',
        alpha: 0.9,
        blend: BlendMode.DstOut,
      });
      canvas.restore();
    }),
  // ふちのがたつき:半径を少しずつずらした多角形
  outline: (size, seed) => {
    const random = createRandom(seed + 1);
    const points = 90;
    const builder = Skia.PathBuilder.Make();
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const radius = planetRadius(size) * (1 + (random() - 0.5) * 0.025);
      const x = size / 2 + Math.cos(angle) * radius;
      const y = size / 2 + Math.sin(angle) * radius;
      if (i === 0) builder.moveTo(x, y);
      else builder.lineTo(x, y);
    }
    return builder.close().build();
  },
};
