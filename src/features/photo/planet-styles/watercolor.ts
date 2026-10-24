// 水彩:本体の土台は、水彩のテクスチャに写真の色を割り当てて塗る(planet-texture.ts)。
// その上に重ねる模様や輪・衛星は、ぬれた紙ににじんだような色の塊で塗る。紙のざらつきと、細かい金色の点。
import { BlendMode } from '@shopify/react-native-skia';

import { darken, lighten, lightestColor, luminance } from '../colors';
import { between, clipped, createRandom, drawGrain, makePaint } from '../planet-draw';
import type { PlanetStyle } from './types';

const GOLD = '#D4AF37';
/** これより明るい色は、乗算だと紙に負けて見えなくなるので、そのまま重ねる */
const LIGHT_COLOR = 0.78;

export const watercolor: PlanetStyle = {
  id: 'watercolor',
  label: '水彩',
  edgeWobble: 0.012,
  edgeSoftness: 2.5,
  usesTexture: true,
  // テクスチャのにじみを残すため、陰影は薄めにする
  shadeStrength: 0.55,
  createBrush: (canvas, size, palette, seed, track) => {
    const random = createRandom(seed + 11);
    const paper = lighten(lightestColor(palette), 0.78);
    const blendFor = (color: string) =>
      luminance(color) > LIGHT_COLOR ? BlendMode.SrcOver : BlendMode.Multiply;

    return {
      ground: (area) => canvas.drawPath(area, makePaint(track, { color: paper })),

      fill: (path, color, options = {}) => {
        const alpha = options.alpha ?? 1;
        const blend = blendFor(color);
        // 少しずらして2回重ね、ぬれた紙ににじんだように見せる
        for (let i = 0; i < 2; i++) {
          canvas.save();
          canvas.translate((random() - 0.5) * size * 0.012, (random() - 0.5) * size * 0.012);
          canvas.drawPath(
            path,
            makePaint(track, {
              color,
              alpha: alpha * 0.45,
              blend,
              blur: size * (options.soft ? 0.03 : between(random, 0.008, 0.018)),
            }),
          );
          canvas.restore();
        }
        // 水がたまって少し濃くなったふち
        if (blend === BlendMode.Multiply) {
          canvas.drawPath(
            path,
            makePaint(track, {
              color: darken(color, 0.2),
              alpha: alpha * 0.14,
              blend,
              stroke: size * 0.005,
              blur: size * 0.004,
            }),
          );
        }
      },

      stroke: (path, color, width, options = {}) =>
        canvas.drawPath(
          path,
          makePaint(track, {
            color,
            alpha: (options.alpha ?? 1) * 0.7,
            blend: blendFor(color),
            stroke: width,
            blur: size * (options.soft ? 0.02 : 0.003),
          }),
        ),

      texture: (area) =>
        clipped(canvas, area, () => {
          // 紙のざらつき
          drawGrain(canvas, track, area, {
            seed,
            grainSize: 1.5,
            threshold: 0.45,
            softness: 0.5,
            color: '#5A5040',
            alpha: 0.12,
            blend: BlendMode.Multiply,
          });
          // 細かい金色の点(広い形ほど多く)
          const bounds = area.getBounds();
          const gold = makePaint(track, { color: GOLD, alpha: 0.75 });
          const count = Math.round((40 * bounds.width * bounds.height) / (size * size)) + 4;
          for (let i = 0; i < count; i++) {
            canvas.drawCircle(
              bounds.x + random() * bounds.width,
              bounds.y + random() * bounds.height,
              between(random, 0.6, 1.6),
              gold,
            );
          }
        }),
    };
  },
};
