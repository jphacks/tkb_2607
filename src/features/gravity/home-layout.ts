// Figma「B01｜宇宙ホーム」(383 × 852)の惑星の置き場所を写したもの。
// GravityView は DESIGN_FRAME・ME_SLOT・fitDesign を使い、背景画像と同じ座標・倍率で惑星を置く。
// どこまで遠くに置けるかは、端末で実際に見えている範囲(visibleDesignRect)で決める(縦横比の違う端末では少し変わる)。
// CANDIDATE_SLOTS(他の人の13か所)は、引力の計算(半径・角度)に置き換えたので今は使っていない(デザインの参考として残す)。

/** デザインの画面サイズ。実機ではこの比率のまま拡大・縮小して、背景画像(contentFit="cover")とそろえる */
export const DESIGN_FRAME = { width: 383, height: 852 };

export type PlanetSlot = {
  /** 惑星の中心(デザイン上の座標) */
  x: number;
  y: number;
  /** 直径 */
  size: number;
  /** 名前ラベルを出すか。デザインでは遠い惑星・見切れる惑星には出していない */
  labeled: boolean;
};

export const ME_SLOT: PlanetSlot = { x: 196, y: 412, size: 94, labeled: true };

/** 自分(ME_SLOT)に近い順 */
export const CANDIDATE_SLOTS: PlanetSlot[] = [
  { x: 298.5, y: 427.5, size: 59, labeled: true }, // Luly
  { x: 134.5, y: 319.5, size: 65, labeled: true }, // Bian
  { x: 151.5, y: 527.5, size: 63, labeled: true }, // Pian
  { x: 67, y: 448, size: 70, labeled: true }, // Oran
  { x: 283.5, y: 278, size: 62, labeled: true }, // Luna
  { x: 290.5, y: 553.5, size: 67, labeled: true }, // Rinrin
  { x: 53, y: 567, size: 37, labeled: false },
  { x: 60, y: 239, size: 42, labeled: false },
  { x: 193, y: 649, size: 62, labeled: true }, // Fuwainu
  { x: 421, y: 548, size: 123, labeled: false }, // 右端で見切れる
  { x: 395.5, y: 193, size: 91, labeled: false }, // 右端で見切れる
  { x: 18, y: 701, size: 96, labeled: false }, // 左端で見切れる
  { x: 35, y: 34, size: 101, labeled: false }, // 左上で見切れる
];

/** デザイン上の座標で表した長方形 */
export type DesignRect = { left: number; top: number; right: number; bottom: number };

/**
 * width × height の画面で実際に見えている範囲を、デザイン上の座標で返す。
 * 縦横比が Figma と違う端末では、左右か上下が切れるので、DESIGN_FRAME より狭くなる
 */
export function visibleDesignRect(width: number, height: number): DesignRect {
  const { scale, offsetX, offsetY } = fitDesign(width, height);
  return {
    left: -offsetX / scale,
    top: -offsetY / scale,
    right: (width - offsetX) / scale,
    bottom: (height - offsetY) / scale,
  };
}

/** width × height の画面の上の長方形(画面の pt)を、デザイン上の座標に直す */
export function screenRectToDesign(rect: DesignRect, width: number, height: number): DesignRect {
  const { scale, offsetX, offsetY } = fitDesign(width, height);
  return {
    left: (rect.left - offsetX) / scale,
    top: (rect.top - offsetY) / scale,
    right: (rect.right - offsetX) / scale,
    bottom: (rect.bottom - offsetY) / scale,
  };
}

/** デザインの座標を画面の座標に直すための倍率とずれ(背景画像の cover と同じ計算) */
export function fitDesign(width: number, height: number) {
  const scale = Math.max(width / DESIGN_FRAME.width, height / DESIGN_FRAME.height);
  return {
    scale,
    offsetX: (width - DESIGN_FRAME.width * scale) / 2,
    offsetY: (height - DESIGN_FRAME.height * scale) / 2,
  };
}
