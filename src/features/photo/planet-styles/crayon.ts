// クレヨン:紙色の下地の上に、短い斜めの線を同じ向きで3回重ねて塗る。紙色の細かい粒で塗り残しを出し、
// ふちは濃いめの色のがたついた線でなぞる。陰影は、右下に暗い色の短い斜線を重ねて描く。
import { BlendMode, ClipOp, Skia, type SkPath } from '@shopify/react-native-skia';

import { darken, lighten, lightestColor, luminance, varyColor } from '../colors';
import { between, circlePath, clipped, createRandom, drawGrain, makePaint } from '../planet-draw';
import type { PlanetStyle } from './types';

/** 斜めの線の長さ・太さ(px) */
const DASH_LENGTH = [10, 26];
const DASH_WIDTHS = [1.6, 2.3, 3];
/** 線の不透明度(この中から選ぶ) */
const DASH_ALPHAS = [0.35, 0.55, 0.75];
/** 重ねる回数 */
const PASSES = 3;
/** 1 回で、形の広さ 1px² あたりに置く線の数(重ねたときに、すき間が少し残るくらい) */
const DASH_DENSITY = 0.012;

export const crayon: PlanetStyle = {
  id: 'crayon',
  label: 'クレヨン',
  edgeWobble: 0.03,
  edgeSoftness: 0,
  createBrush: (canvas, size, palette, seed, track) => {
    const random = createRandom(seed + 23);
    const paper = lighten(lightestColor(palette), 0.85);
    const darkest = palette.reduce((a, b) => (luminance(b) < luminance(a) ? b : a));
    // 1 つの惑星の中では、線の向きをそろえる
    const angle = (between(random, 25, 65) * Math.PI) / 180;

    /**
     * area の中に、短い斜めの線をたくさん置く。
     * 線を1本ずつ描くと遅いので、色・太さ・不透明度が同じ線を1つの形にまとめて描く
     */
    const dashes = (area: SkPath, color: string, alpha: number, passes: number, density: number) =>
      clipped(canvas, area, () => {
        const b = area.getBounds();
        // 帯の色の明るさを少しずつ変えた色
        const shades = Array.from({ length: 4 }, () => varyColor(color, random, 0.12));
        for (let pass = 0; pass < passes; pass++) {
          const groups = new Map<
            string,
            { color: string; width: number; alpha: number; d: string[] }
          >();
          const count = Math.round(b.width * b.height * density);
          for (let i = 0; i < count; i++) {
            const shade = shades[Math.floor(random() * shades.length)];
            const width = DASH_WIDTHS[Math.floor(random() * DASH_WIDTHS.length)];
            const dashAlpha = DASH_ALPHAS[Math.floor(random() * DASH_ALPHAS.length)];
            const key = `${shade}|${width}|${dashAlpha}`;
            let group = groups.get(key);
            if (!group) {
              group = { color: shade, width, alpha: dashAlpha, d: [] };
              groups.set(key, group);
            }
            const x = b.x + random() * b.width;
            const y = b.y + random() * b.height;
            const a = angle + (random() - 0.5) * 0.15;
            const half = between(random, DASH_LENGTH[0], DASH_LENGTH[1]) / 2;
            const dx = Math.cos(a) * half;
            const dy = Math.sin(a) * half;
            group.d.push(
              `M${(x - dx).toFixed(1)} ${(y - dy).toFixed(1)}L${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)}`,
            );
          }
          for (const group of groups.values()) {
            const path = Skia.Path.MakeFromSVGString(group.d.join(''));
            if (!path) continue;
            canvas.drawPath(
              track(path),
              makePaint(track, {
                color: group.color,
                alpha: group.alpha * alpha,
                stroke: group.width,
              }),
            );
          }
        }
      });

    return {
      ground: (area) => canvas.drawPath(area, makePaint(track, { color: paper })),

      fill: (path, color, options = {}) => {
        const alpha = options.alpha ?? 1;
        if (options.soft) {
          canvas.drawPath(
            path,
            makePaint(track, { color, alpha: alpha * 0.35, blur: size * 0.02 }),
          );
        }
        dashes(path, color, alpha, PASSES, DASH_DENSITY);
      },

      stroke: (path, color, width, options = {}) => {
        const alpha = (options.alpha ?? 1) * 0.9;
        if (options.soft) {
          canvas.drawPath(
            path,
            makePaint(track, {
              color,
              alpha: alpha * 0.4,
              stroke: width * 2.5,
              blur: size * 0.015,
            }),
          );
        }
        // 少しずらして2回なぞり、がたついた線にする
        for (let i = 0; i < 2; i++) {
          canvas.save();
          canvas.translate((random() - 0.5) * width, (random() - 0.5) * width);
          canvas.drawPath(
            path,
            makePaint(track, {
              color,
              alpha: alpha * 0.7,
              stroke: width * between(random, 0.7, 1),
            }),
          );
          canvas.restore();
        }
      },

      // 紙色の細かい粒を散らして、紙の凸凹で塗り残したように見せる
      texture: (area) =>
        clipped(canvas, area, () =>
          drawGrain(canvas, track, area, {
            seed,
            grainSize: 1.4,
            threshold: 0.68,
            softness: 0.1,
            color: paper,
            alpha: 0.9,
            blend: BlendMode.SrcOver,
          }),
        ),

      // ふち:濃いめの色で、がたついた線を3回なぞる
      outline: (area) => {
        const edge = darken(darkest, 0.2);
        for (let i = 0; i < 3; i++) {
          canvas.save();
          canvas.translate((random() - 0.5) * 2.4, (random() - 0.5) * 2.4);
          canvas.drawPath(
            area,
            makePaint(track, { color: edge, alpha: 0.55, stroke: between(random, 1.6, 2.6) }),
          );
          canvas.restore();
        }
      },

      // 陰影:光の当たる左上の丸を除いた右下に、暗い色の短い斜線を重ねる。内側ほど濃くなるよう2段にする
      shade: (area, cx, cy, r) => {
        const shadow = darken(darkest, 0.35);
        for (const [offset, alpha] of [
          [0.25, 0.5],
          [0.5, 0.7],
        ] as const) {
          const lit = track(circlePath(cx - r * offset, cy - r * offset, r * 1.05));
          canvas.save();
          canvas.clipPath(lit, ClipOp.Difference, true);
          dashes(area, shadow, alpha, 1, DASH_DENSITY * 1.5);
          canvas.restore();
        }
      },
    };
  },
};
