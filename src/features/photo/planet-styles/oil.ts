// 油絵:短い筆の跡を、向きをそろえて重ねる。筆の跡の片側に明るい線を入れて厚みを出す。ぼかしは使わない。
import { PaintStyle, Skia, StrokeCap } from '@shopify/react-native-skia';

import { darken, lighten } from '../colors';
import { bandColor, createRandom, makePaint, withDisposables } from './common';
import type { PlanetStyle } from './types';

const STROKE_COUNT = 420;

export const oil: PlanetStyle = {
  id: 'oil',
  label: '油絵',
  draw: (canvas, palette, size, seed) =>
    withDisposables((track) => {
      const random = createRandom(seed);

      // 下塗り
      canvas.drawPaint(makePaint(track, { color: darken(palette[0], 0.15) }));

      // 筆の跡は数が多いので、ペンを2本だけ作って色と太さを変えながら使う
      const brush = track(Skia.Paint());
      brush.setAntiAlias(true);
      brush.setStyle(PaintStyle.Stroke);
      brush.setStrokeCap(StrokeCap.Round);
      const highlight = track(brush.copy());

      const flow = random() * Math.PI;
      for (let i = 0; i < STROKE_COUNT; i++) {
        const x = random() * size;
        const y = random() * size;
        // 場所によって少しずつ向きが変わる、ゆるやかな流れ
        const angle = flow + Math.sin(((x + y) / size) * 3 + seed) * 0.5;
        const half = (size * (0.035 + random() * 0.03)) / 2;
        const dx = Math.cos(angle) * half;
        const dy = Math.sin(angle) * half;
        const width = size * (0.018 + random() * 0.012);
        const base = bandColor(palette, y / size, random);
        const color =
          random() < 0.5 ? lighten(base, random() * 0.12) : darken(base, random() * 0.12);

        brush.setColor(Skia.Color(color));
        brush.setStrokeWidth(width);
        canvas.drawLine(x - dx, y - dy, x + dx, y + dy, brush);

        // 厚みのハイライト:光が当たる左上側に、細く明るい線
        const offset = width * 0.3;
        highlight.setColor(Skia.Color(lighten(color, 0.45)));
        highlight.setAlphaf(0.55);
        highlight.setStrokeWidth(width * 0.25);
        canvas.drawLine(
          x - dx - offset,
          y - dy - offset,
          x + dx - offset,
          y + dy - offset,
          highlight,
        );
      }
    }),
};
