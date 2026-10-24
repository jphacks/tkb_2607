// 写真の雰囲気(色の特徴)から、惑星の種類と形を決める。AI は使わず、色の数値としきい値だけで決める。
// 同じ写真なら、取り出す色が同じなので、毎回同じ結果になる。
import { hueDistance, luminance, toHsl } from './colors';
import { getPlanetType } from './planet-types';

export type PlanetMood = 'soft' | 'vivid' | 'calm' | 'dark';

export type PlanetTraits = {
  /** 惑星の種類(planet-types の id) */
  type: string;
  /** 輪があるか */
  rings: boolean;
  /** 衛星の数 */
  moons: 0 | 1 | 2;
  /** 雰囲気(画面の一言に使う) */
  mood: PlanetMood;
};

/** 写真の色の特徴(どれも 0〜1。warmth だけ -1〜1) */
export type PhotoMetrics = {
  /** 明るさの平均 */
  brightness: number;
  /** 鮮やかさの平均 */
  saturation: number;
  /** 暖色(赤・橙・黄)寄りなら +、寒色(青・水色)寄りなら - */
  warmth: number;
  /** いちばん明るい色といちばん暗い色の差 */
  contrast: number;
  /** はっきりした色みが何種類あるか(1 種類で 0、4 種類以上で 1) */
  colorfulness: number;
  /** 緑〜青の色の割合 */
  greenBlue: number;
};

// ---- ここを変えると、どの写真がどの種類になるかが変わる ----

/** しきい値 */
export const TRAIT_THRESHOLDS = {
  /** これより暗いと「暗い」 */
  dark: 0.32,
  /** 明暗の差がこれより大きく、かつ明るさが darkish より暗いと「明暗の差が強い」 */
  strongContrast: 0.7,
  darkish: 0.45,
  /** 緑〜青の色がこの割合以上なら「緑や青が多い」 */
  greenBlue: 0.5,
  /** 暖かさ・鮮やかさがこれ以上なら「暖色・鮮やか」 */
  warm: 0.15,
  vivid: 0.45,
  /** 暖かさがこれ以下(寒色寄り)で、明るさがこれ以上なら「寒色・明るい」 */
  cool: -0.05,
  bright: 0.6,
  /** 色の多さがこれ以上なら「カラフル」 */
  colorful: 0.6,
  /** 色の多さがこれ以上なら衛星 2 つ、one 以上なら 1 つ */
  twoMoons: 0.66,
  oneMoon: 0.33,
  /** これより鮮やかな色だけを「はっきりした色み」として数える */
  colorSaturation: 0.25,
  /** 色みがこれ(度)以上離れていれば、別の色として数える */
  colorHueGap: 40,
};

const T = TRAIT_THRESHOLDS;

type TraitRule = {
  /** ログに出す名前 */
  name: string;
  when: (m: PhotoMetrics) => boolean;
  traits: Omit<PlanetTraits, 'moons'>;
};

/** 写真の雰囲気 → 種類と形の対応表。上から順に見て、最初に当てはまったものになる */
export const TRAIT_RULES: TraitRule[] = [
  {
    name: '暗い・明暗の差が強い',
    when: (m) =>
      m.brightness < T.dark || (m.contrast > T.strongContrast && m.brightness < T.darkish),
    traits: { type: 'rocky', rings: false, mood: 'dark' },
  },
  {
    name: '緑や青が多い',
    when: (m) => m.greenBlue >= T.greenBlue,
    traits: { type: 'ocean', rings: false, mood: 'calm' },
  },
  {
    name: '暖色・鮮やか',
    when: (m) => m.warmth >= T.warm && m.saturation >= T.vivid,
    traits: { type: 'lava', rings: false, mood: 'vivid' },
  },
  {
    name: '寒色・明るい',
    when: (m) => m.warmth <= T.cool && m.brightness >= T.bright,
    traits: { type: 'ice', rings: false, mood: 'calm' },
  },
  {
    name: 'カラフル・色が多い',
    when: (m) => m.colorfulness >= T.colorful,
    traits: { type: 'gas', rings: true, mood: 'vivid' },
  },
];

/** どれにも当てはまらなかったとき */
const DEFAULT_RULE: Omit<TraitRule, 'when'> = {
  name: '淡い・やわらかい',
  traits: { type: 'gas', rings: false, mood: 'soft' },
};

/** 画面の一言に使う、雰囲気の言葉 */
const MOOD_LABELS: Record<PlanetMood, string> = {
  soft: 'やわらかい',
  vivid: 'あざやかな',
  calm: 'おだやかな',
  dark: '深みのある',
};

// ---- ここまで ----

/** 写真から取り出した色を、雰囲気を表す数値にする */
export function measurePalette(palette: string[]): PhotoMetrics {
  const colors = palette.map((color) => ({ ...toHsl(color), luma: luminance(color) }));
  const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  const lumas = colors.map((c) => c.luma);

  const vivid = colors.filter((c) => c.s >= T.colorSaturation && c.l > 0.12 && c.l < 0.92);
  const hues: number[] = [];
  for (const c of vivid) {
    if (hues.every((h) => hueDistance(h, c.h) >= T.colorHueGap)) hues.push(c.h);
  }

  return {
    brightness: average(lumas),
    saturation: average(colors.map((c) => c.s)),
    // 色みが橙(30 度)に近いほど +、水色〜青(210 度)に近いほど -。鮮やかな色ほど強く数える
    warmth: average(colors.map((c) => c.s * Math.cos(((c.h - 30) * Math.PI) / 180))),
    contrast: Math.max(...lumas) - Math.min(...lumas),
    colorfulness: Math.min(1, Math.max(0, (hues.length - 1) / 3)),
    greenBlue: vivid.filter((c) => c.h >= 75 && c.h <= 260).length / colors.length,
  };
}

/** 写真から取り出した色から、惑星の種類と形を決める */
export function decidePlanetTraits(palette: string[]): PlanetTraits {
  const metrics = measurePalette(palette);
  const rule = TRAIT_RULES.find((r) => r.when(metrics)) ?? DEFAULT_RULE;
  const moons = metrics.colorfulness >= T.twoMoons ? 2 : metrics.colorfulness >= T.oneMoon ? 1 : 0;
  const traits: PlanetTraits = { ...rule.traits, moons };
  if (__DEV__) {
    const rounded = Object.fromEntries(
      Object.entries(metrics).map(([key, value]) => [key, Math.round(value * 100) / 100]),
    );
    console.log(
      `[photo] 写真の数値:${JSON.stringify(rounded)} → ${rule.name}:${JSON.stringify(traits)}`,
    );
  }
  return traits;
}

/** 画面に出す一言(例:「やわらかい雰囲気から、輪のあるガス惑星になりました」) */
export function describePlanetTraits(traits: PlanetTraits): string {
  const rings = traits.rings ? '輪のある' : '';
  return `${MOOD_LABELS[traits.mood]}雰囲気から、${rings}${getPlanetType(traits.type).label}になりました`;
}
