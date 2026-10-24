// ホームの宇宙背景のうち、「星の飾り」と「軌道の点線」の置き場所の一覧。
// Figma: tuzuya ページ「B01｜宇宙ホーム 背景レイヤー(ズーム用)」(node 537:209)から写した。
//
// 背景は3つの層に分けて描く。
// - グラデーション:動かない(SpaceBackground)
// - 軌道の点線(ORBITS):惑星と一緒に拡大・縮小する
// - 星の飾り(SPACE_DECORATIONS):位置だけ動き、大きさは変えない
//
// 座標と大きさはすべて B01 のフレーム(383×852)の座標で、星は「中心」と「描く箱の大きさ」。
// 縮小しても画面の端に星のない部分ができないように、フレームの外(DECORATION_BOUNDS:縦横2倍の範囲)にも置いてある。
// フレームの中の星は、元の B01 と同じ位置。

/** B01 のフレームの大きさ。引力側の home-layout.ts の DESIGN_FRAME と同じ値 */
export const B01_FRAME = { width: 383, height: 852 };

/** 星を置いてある範囲(B01 の座標)。フレームを中心に縦横2倍。縮小は 0.5 倍までなら星が途切れない */
export const DECORATION_BOUNDS = { x: -191.5, y: -426, width: 766, height: 1704 };

/**
 * 星の種類。
 * - sparkle:小さい白い星(光のにじみ込み)
 * - metal:金属のひし形の星
 * - glass:大きいガラスの星
 * - checker:市松模様のドット(にじみ込み)
 */
export type DecorationKind = 'sparkle' | 'metal' | 'glass' | 'checker';

/** 種類ごとの画像(背景が透明な PNG)。width × height の箱いっぱいに引き伸ばして描く */
export const DECORATION_IMAGES: Record<DecorationKind, number> = {
  sparkle: require('@/assets/images/home/space-star-sparkle.png'),
  metal: require('@/assets/images/home/space-star-metal.png'),
  glass: require('@/assets/images/home/space-star-glass.png'),
  checker: require('@/assets/images/home/space-checker.png'),
};

export type SpaceDecoration = {
  kind: DecorationKind;
  /** 中心(B01 の座標) */
  x: number;
  y: number;
  /** 描く箱の大きさ(B01 の座標での長さ。光のにじみも含む) */
  width: number;
  height: number;
};

/** 星の飾り。並び順は描く順(後ろほど手前):ガラス → 市松模様 → 金属 → 小さい星 */
export const SPACE_DECORATIONS: SpaceDecoration[] = [
  { kind: 'glass', x: 366, y: 642.5, width: 100, height: 109 },
  { kind: 'glass', x: 358, y: 350.5, width: 100, height: 109 },
  { kind: 'glass', x: 255, y: 59.5, width: 100, height: 109 },
  { kind: 'glass', x: 121, y: 779.5, width: 100, height: 109 },
  { kind: 'glass', x: 31, y: 104.5, width: 100, height: 109 },
  { kind: 'glass', x: -74.6, y: 155, width: 109.8, height: 119.7 },
  { kind: 'glass', x: 343.8, y: -252.1, width: 89.9, height: 98 },
  { kind: 'glass', x: 288.8, y: 932.9, width: 94.9, height: 103.5 },
  { kind: 'glass', x: -107.2, y: 254.2, width: 91.8, height: 100 },
  { kind: 'glass', x: 114.3, y: 934, width: 91.5, height: 99.8 },
  { kind: 'glass', x: 560.3, y: 350.4, width: 108.5, height: 118.3 },
  { kind: 'glass', x: 236.5, y: 1037.5, width: 103.3, height: 112.6 },
  { kind: 'glass', x: 468.8, y: 134.9, width: 91.8, height: 100 },
  { kind: 'glass', x: -102.4, y: 595.9, width: 87.5, height: 95.3 },
  { kind: 'glass', x: -39.2, y: 694.6, width: 86.8, height: 94.7 },
  { kind: 'checker', x: 349.5, y: 222.5, width: 47, height: 45 },
  { kind: 'checker', x: 91, y: 170.5, width: 66, height: 63 },
  { kind: 'checker', x: 350, y: 793, width: 52, height: 52 },
  { kind: 'checker', x: 8.5, y: 996.1, width: 66.2, height: 63.2 },
  { kind: 'checker', x: 260.3, y: -302.7, width: 68, height: 64.9 },
  { kind: 'checker', x: 521.5, y: 1194.1, width: 59.4, height: 59.4 },
  { kind: 'checker', x: 466.3, y: 636.7, width: 45.6, height: 45.6 },
  { kind: 'checker', x: -22.3, y: 1078.4, width: 35.9, height: 34.4 },
  { kind: 'checker', x: 458.4, y: 953.2, width: 64.5, height: 61.5 },
  { kind: 'metal', x: 112.5, y: 44, width: 43, height: 72 },
  { kind: 'metal', x: 336, y: 132.5, width: 42, height: 79 },
  { kind: 'metal', x: 34.5, y: 336, width: 47, height: 70 },
  { kind: 'metal', x: 273, y: 756, width: 58, height: 108 },
  { kind: 'metal', x: 80.5, y: 666.5, width: 49, height: 91 },
  { kind: 'metal', x: 216, y: 223, width: 40, height: 74 },
  { kind: 'metal', x: -80.1, y: 907.7, width: 37.6, height: 70.7 },
  { kind: 'metal', x: 139.3, y: -176.9, width: 52.6, height: 98 },
  { kind: 'metal', x: 548.1, y: -12.5, width: 45.5, height: 76.1 },
  { kind: 'metal', x: 385.9, y: 1101.2, width: 48.7, height: 90.4 },
  { kind: 'metal', x: -153.7, y: -55.3, width: 39, height: 72.2 },
  { kind: 'metal', x: -162.7, y: 50.8, width: 42.2, height: 62.9 },
  { kind: 'metal', x: 430.7, y: 1163.2, width: 40.3, height: 74.9 },
  { kind: 'metal', x: -103.5, y: 1182, width: 45.1, height: 75.6 },
  { kind: 'metal', x: 105.7, y: 1046.1, width: 49.1, height: 73.2 },
  { kind: 'metal', x: 494.4, y: 261.9, width: 55.7, height: 103.5 },
  { kind: 'metal', x: 291.6, y: -371.9, width: 34.9, height: 58.4 },
  { kind: 'metal', x: 162.3, y: -285.4, width: 43.4, height: 72.7 },
  { kind: 'metal', x: 69.7, y: 1203.4, width: 52.9, height: 98.2 },
  { kind: 'sparkle', x: 124.5, y: 407.5, width: 23, height: 25 },
  { kind: 'sparkle', x: 246.5, y: 361.5, width: 19, height: 23 },
  { kind: 'sparkle', x: 248, y: 478, width: 22, height: 24 },
  { kind: 'sparkle', x: 330, y: 712, width: 22, height: 24 },
  { kind: 'sparkle', x: 300, y: 642, width: 22, height: 24 },
  { kind: 'sparkle', x: 236, y: 121, width: 22, height: 24 },
  { kind: 'sparkle', x: 137, y: 99, width: 22, height: 24 },
  { kind: 'sparkle', x: 315, y: 177.5, width: 28, height: 31 },
  { kind: 'sparkle', x: 253, y: 188, width: 22, height: 24 },
  { kind: 'sparkle', x: 168, y: 153, width: 22, height: 24 },
  { kind: 'sparkle', x: 118, y: 226, width: 22, height: 24 },
  { kind: 'sparkle', x: 370.5, y: 441, width: 25, height: 28 },
  { kind: 'sparkle', x: 336, y: 503, width: 22, height: 24 },
  { kind: 'sparkle', x: 203, y: 764, width: 22, height: 24 },
  { kind: 'sparkle', x: 272, y: 686, width: 22, height: 24 },
  { kind: 'sparkle', x: 142, y: 709, width: 22, height: 24 },
  { kind: 'sparkle', x: 217, y: 567.5, width: 26, height: 29 },
  { kind: 'sparkle', x: 50, y: 630, width: 22, height: 24 },
  { kind: 'sparkle', x: 13.5, y: 458, width: 23, height: 26 },
  { kind: 'sparkle', x: 60, y: 906.3, width: 23.2, height: 25.3 },
  { kind: 'sparkle', x: 184.9, y: -29.7, width: 16.6, height: 20.1 },
  { kind: 'sparkle', x: -158.6, y: 770.2, width: 27.8, height: 30.3 },
  { kind: 'sparkle', x: -122.8, y: -369.2, width: 22.5, height: 24.5 },
  { kind: 'sparkle', x: -0.4, y: -31.7, width: 16.9, height: 18.4 },
  { kind: 'sparkle', x: 99.7, y: -387.4, width: 20.4, height: 22.3 },
  { kind: 'sparkle', x: 509.6, y: 797.4, width: 21.1, height: 23 },
  { kind: 'sparkle', x: 445.8, y: 372.3, width: 24.4, height: 26.6 },
  { kind: 'sparkle', x: -164.2, y: 287.6, width: 26.7, height: 29.1 },
  { kind: 'sparkle', x: -60.9, y: -369.8, width: 19.1, height: 20.8 },
  { kind: 'sparkle', x: 74.4, y: -222.5, width: 17.1, height: 18.7 },
  { kind: 'sparkle', x: 344, y: 862, width: 30.2, height: 32.9 },
  { kind: 'sparkle', x: 431.2, y: 428.6, width: 26.1, height: 28.5 },
  { kind: 'sparkle', x: -99.4, y: 1125.3, width: 25.6, height: 27.9 },
  { kind: 'sparkle', x: 319.4, y: -26.8, width: 24.9, height: 27.1 },
  { kind: 'sparkle', x: -37.6, y: 236.2, width: 25.3, height: 27.6 },
  { kind: 'sparkle', x: 5.3, y: -193.6, width: 25.1, height: 30.4 },
  { kind: 'sparkle', x: 487.3, y: 1224.6, width: 25.8, height: 28.2 },
  { kind: 'sparkle', x: 23, y: 1117.4, width: 23.7, height: 25.8 },
  { kind: 'sparkle', x: -31.8, y: -67.5, width: 16.9, height: 18.4 },
  { kind: 'sparkle', x: 212.1, y: 1168.2, width: 22.2, height: 24.2 },
  { kind: 'sparkle', x: 532.6, y: 963.5, width: 17.8, height: 19.4 },
  { kind: 'sparkle', x: 438.8, y: -370.1, width: 18.9, height: 20.6 },
  { kind: 'sparkle', x: -47.9, y: 363.3, width: 19.9, height: 21.7 },
  { kind: 'sparkle', x: 486.6, y: 807.2, width: 27.1, height: 29.6 },
  { kind: 'sparkle', x: 424.9, y: -210, width: 18.7, height: 20.3 },
  { kind: 'sparkle', x: 17.7, y: -94, width: 20, height: 21.8 },
  { kind: 'sparkle', x: 246.4, y: -107.2, width: 29.7, height: 32.4 },
  { kind: 'sparkle', x: -40.1, y: 952.4, width: 18.7, height: 20.4 },
  { kind: 'sparkle', x: 416.5, y: 705.3, width: 28.1, height: 31.1 },
  { kind: 'sparkle', x: -149.6, y: -207.8, width: 24.6, height: 26.9 },
  { kind: 'sparkle', x: 301, y: -58.3, width: 33.8, height: 37.4 },
  { kind: 'sparkle', x: 102.9, y: -123.6, width: 19.4, height: 22 },
  { kind: 'sparkle', x: 169.5, y: 892.5, width: 22.9, height: 25.9 },
  { kind: 'sparkle', x: -63.7, y: 401.7, width: 27.8, height: 30.3 },
  { kind: 'sparkle', x: 32.1, y: 1261.2, width: 29.7, height: 32.4 },
  { kind: 'sparkle', x: 411.1, y: 84.3, width: 26, height: 28.4 },
  { kind: 'sparkle', x: 504, y: -143.8, width: 20.1, height: 21.9 },
  { kind: 'sparkle', x: 337.1, y: -135.9, width: 29.4, height: 32.1 },
  { kind: 'sparkle', x: 36.7, y: 1028.1, width: 16.8, height: 20.3 },
];

export type OrbitEllipse = {
  /** 楕円の中心(B01 の座標) */
  cx: number;
  cy: number;
  /** 横幅・縦幅(B01 の座標での長さ) */
  width: number;
  height: number;
};

/** 軌道の点線(内側から順)。Figma の B01 の「Group 3」 */
export const ORBITS: OrbitEllipse[] = [
  { cx: 192, cy: 417, width: 200.8, height: 206 },
  { cx: 193.4, cy: 420.5, width: 260.2, height: 267 },
  { cx: 190.6, cy: 421.5, width: 326.5, height: 335 },
  { cx: 193, cy: 421, width: 456, height: 456 },
  { cx: 188.5, cy: 440.5, width: 621, height: 621 },
  { cx: 191.5, cy: 443.5, width: 661.7, height: 679 },
];

/**
 * 軌道の点線の見た目。線の太さ・点の長さ・間隔も B01 の座標での長さなので、拡大・縮小に合わせて変わる。
 * Figma では白い点線(1.4 描いて 2.5 空ける)にざらつき(Texture)をかけているので、アプリでは薄くして近づけている
 */
export const ORBIT_STYLE = {
  color: '#FFFFFF',
  opacity: 0.45,
  strokeWidth: 1,
  dash: [1.4, 2.5],
};

/**
 * B01 の座標を画面の座標に直すための倍率とずれ(画面いっぱいに覆う cover の計算)。
 * 引力側の home-layout.ts の fitDesign と同じ計算なので、惑星と位置がそろう
 */
export function fitB01(width: number, height: number) {
  const scale = Math.max(width / B01_FRAME.width, height / B01_FRAME.height);
  return {
    scale,
    offsetX: (width - B01_FRAME.width * scale) / 2,
    offsetY: (height - B01_FRAME.height * scale) / 2,
  };
}
