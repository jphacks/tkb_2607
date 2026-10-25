// デザイントークン。Figma(JPHACKS2026 の token ページ)の変数・スタイルと同じ名前・同じ値にそろえている。
// 画面のコードでは色や数値を直接書かず、ここから取る。値を変えるときは Figma 側も一緒に直す。

// ---------- Primitives(生の色。画面からは直接使わず、下の color から使う) ----------
const primitive = {
  blue500: '#1A0FFF',
  violet500: '#523DF2',
  lavender25: '#FCFCFF',
  lavender50: '#EDEBFC',
  lavender100: '#E8E5FF',
  lavender200: '#C7C2FF',
  lavender300: '#ADA3ED',
  periwinkle400: '#8C96EB',
  mist400: '#8285B8',
  plum500: '#6B5E9E',
  plum800: '#3B2B73',
  navy900: '#17174C',
  gray50: '#F4F3F7',
  gray100: '#E5E5ED',
  gray200: '#D9D9D9',
  gray400: '#ABABAB',
  gray600: '#5E5E5E',
  gray700: '#3C3C3C',
  white: '#FFFFFF',
  black: '#000000',
  space900: '#140A40',
  space800: '#2E175F',
  space700: '#574081',
  space600: '#7B65A6',
  space500: '#8D7DB4',
  whiteA7: 'rgba(255, 255, 255, 0.07)',
  whiteA42: 'rgba(255, 255, 255, 0.42)',
  whiteA55: 'rgba(255, 255, 255, 0.55)',
  whiteA70: 'rgba(255, 255, 255, 0.70)',
  whiteA85: 'rgba(255, 255, 255, 0.85)',
  blackA33: 'rgba(0, 0, 0, 0.33)',
  periwinkleA35: 'rgba(140, 150, 235, 0.35)',
  lavenderA65: 'rgba(173, 163, 237, 0.65)',
  lavenderA70: 'rgba(199, 194, 255, 0.70)',
  violetA32: 'rgba(82, 61, 242, 0.32)',
} as const;

// ---------- Color(用途別の色) ----------
export const color = {
  bg: {
    space: primitive.space900,
    sheet: primitive.gray50,
    surface: primitive.white,
    surfaceDashed: primitive.lavender25,
    accentSubtle: primitive.lavender50,
    accentSoft: primitive.lavender100,
    accentMuted: primitive.lavender200,
    primary: primitive.blue500,
    primaryDisabled: primitive.lavender200,
    inactive: primitive.gray200,
    glass: primitive.whiteA7,
    overlay: primitive.blackA33,
  },
  text: {
    primary: primitive.blue500,
    strong: primitive.plum800,
    secondary: primitive.plum500,
    tertiary: primitive.mist400,
    neutral: primitive.gray700,
    neutralMuted: primitive.gray600,
    disabled: primitive.gray400,
    /** 惑星の名前ラベルの文字(紺) */
    label: primitive.navy900,
    onPrimary: primitive.white,
    onDark: primitive.gray50,
    onDarkMuted: primitive.whiteA55,
  },
  border: {
    default: primitive.periwinkleA35,
    subtle: primitive.lavenderA65,
    neutral: primitive.gray100,
    primary: primitive.blue500,
    accent: primitive.periwinkle400,
    secondaryButton: primitive.lavenderA70,
    onDark: primitive.whiteA42,
    onImage: primitive.white,
  },
  icon: {
    primary: primitive.blue500,
    onDark: primitive.white,
    neutral: primitive.gray700,
    disabled: primitive.lavender200,
  },
  decor: {
    planetRing: primitive.whiteA85,
    orbit: primitive.whiteA55,
    sparkle: primitive.whiteA70,
  },
} as const;

// ---------- Dimension ----------
export const space = { '2xs': 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32 } as const;

/** 既存画面の実測値(画面の枠組みに使う) */
export const layout = { screenX: 25, headerTop: 65, sheetInset: 18, sheetPadding: 23 } as const;

export const radius = { xs: 2, sm: 4, md: 8, lg: 16, sheet: 38, full: 999 } as const;

export const size = { buttonLg: 44, buttonSm: 29, tag: 22, iconButton: 28 } as const;

export const stroke = { hairline: 0.7, default: 1, strong: 1.5, bold: 2 } as const;

// ---------- Typography ----------
// Figma の太さ(Regular / Medium / Bold)ごとに、読み込んだフォントの名前が変わる(src/theme/fonts.ts)
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  bold: 'Inter_700Bold',
} as const;

type TextStyleToken = {
  fontFamily: string;
  fontSize: number;
  lineHeight?: number;
  letterSpacing?: number;
};

/** Figma の字間(%)を React Native の px に直す */
const tracking = (fontSize: number, percent: number) => (fontSize * percent) / 100;

export const typography = {
  titleScreen: { fontFamily: fontFamily.bold, fontSize: 24 },
  titleSection: { fontFamily: fontFamily.bold, fontSize: 16 },
  titleItem: { fontFamily: fontFamily.bold, fontSize: 13 },
  bodyLead: { fontFamily: fontFamily.regular, fontSize: 17 },
  bodyMedium: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  bodySmall: { fontFamily: fontFamily.regular, fontSize: 11, lineHeight: 19 },
  bodyXSmall: { fontFamily: fontFamily.regular, fontSize: 10, lineHeight: 16 },
  captionCard: { fontFamily: fontFamily.regular, fontSize: 8 },
  labelButton: { fontFamily: fontFamily.bold, fontSize: 12 },
  labelSmall: { fontFamily: fontFamily.bold, fontSize: 11 },
  labelTag: { fontFamily: fontFamily.medium, fontSize: 11 },
  labelTagSmall: { fontFamily: fontFamily.bold, fontSize: 7 },
  /** ホームの惑星の名前ラベル */
  labelPlanet: { fontFamily: fontFamily.bold, fontSize: 8 },
  /** ホーム左下のピル(◯ stars nearby) */
  labelPill: { fontFamily: fontFamily.medium, fontSize: 10 },
  labelCaps: { fontFamily: fontFamily.bold, fontSize: 9, letterSpacing: tracking(9, 20) },
  labelOverline: { fontFamily: fontFamily.regular, fontSize: 12, letterSpacing: tracking(12, 13) },
  labelHint: { fontFamily: fontFamily.medium, fontSize: 10, letterSpacing: tracking(10, 13) },
  navBack: { fontFamily: fontFamily.regular, fontSize: 15 },
  numericStat: { fontFamily: fontFamily.regular, fontSize: 20 },
  numericCount: { fontFamily: fontFamily.bold, fontSize: 14 },
} as const satisfies Record<string, TextStyleToken>;

// ---------- Effect ----------
// React Native の boxShadow(CSS と同じ書き方)。Figma の blur 値をそのまま blur 半径に使う
export const shadow = {
  xs: '0 2px 4px rgba(26, 20, 77, 0.18)',
  sm: '0 2px 5px rgba(51, 38, 102, 0.08)',
  lg: '0 5px 12px rgba(31, 20, 89, 0.20)',
  sheet: '0 5px 16px rgba(46, 36, 107, 0.10)',
  cardOnDark: '0 6px 14px rgba(15, 5, 51, 0.26)',
  /** 惑星の影。大きさに比例する(94px の惑星で y 3.76px・blur 7.52px) */
  planet: (diameter: number) =>
    `0 ${diameter * 0.04}px ${diameter * 0.08}px rgba(31, 20, 89, 0.16)`,
} as const;

/**
 * 日本語の文字用。Inter には日本語の文字がなく、iPhone の標準の日本語フォントで出る。
 * そのとき太さが Inter の名前から伝わらないので、fontFamily を外して fontWeight で太さを指定する
 */
export function ja(style: TextStyleToken) {
  const { fontFamily: family, ...rest } = style;
  const fontWeight =
    family === fontFamily.bold
      ? ('700' as const)
      : family === fontFamily.medium
        ? ('500' as const)
        : ('400' as const);
  return { ...rest, fontWeight };
}

export const gradient = {
  /** 宇宙の背景(Gradient/Space Background)。中心が濃く、外側ほど明るい紫 */
  space: {
    backgroundImage: `radial-gradient(circle farthest-corner at 50% 50%, ${primitive.space900} 0%, ${primitive.space800} 26.6%, #432C70 44%, ${primitive.space700} 61.5%, ${primitive.space600} 86.5%, ${primitive.space500} 97%)`,
  },
  /** 水彩惑星の立体感を出す陰影(Gradient/Planet Shading)。不透明度 0.84 で重ねる */
  planetShading: {
    backgroundImage:
      'radial-gradient(circle closest-side, rgba(255, 255, 255, 0) 55%, #666666 100%)',
    opacity: 0.84,
  },
} as const;
