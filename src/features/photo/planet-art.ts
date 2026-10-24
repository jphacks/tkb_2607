// 色の一覧から惑星の画像を描く。画面には出さずに Skia のキャンバスに描き、背景が透明な PNG にする。
import { ClipOp, ImageFormat, Skia } from '@shopify/react-native-skia';

import { savePngToCache } from './files';
import { PLANET_STYLES, getPlanetStyle } from './planet-styles';
import { circlePath, drawShade } from './planet-styles/common';

/** 惑星の画像の1辺(px) */
export const PLANET_SIZE = 512;

export type PlanetCandidate = {
  styleId: string;
  /** 画風の名前(水彩・クレヨンなど) */
  label: string;
  imageUri: string;
};

/** 新しい seed(模様の種)を作る */
export function newPlanetSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

/** palette の色・styleId の画風で惑星を描き、PNG をキャッシュに保存して URI を返す */
export async function renderPlanetPng(
  palette: string[],
  styleId: string,
  seed: number,
): Promise<string> {
  const style = getPlanetStyle(styleId);
  // Skia の画像やキャンバスは JS のゴミ集め(GC)では解放されにくいので、使い終わったら dispose() する
  const disposables: { dispose(): void }[] = [];
  try {
    const surface = Skia.Surface.Make(PLANET_SIZE, PLANET_SIZE);
    if (!surface) throw new Error('惑星を描くキャンバスを作れませんでした');
    disposables.push(surface);
    const outline = style.outline?.(PLANET_SIZE, seed) ?? circlePath(PLANET_SIZE);
    disposables.push(outline);

    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color('transparent'));
    canvas.save();
    // 惑星の形で切り抜いてから描くので、画風の側ははみ出しを気にしなくてよい
    canvas.clipPath(outline, ClipOp.Intersect, true);
    style.draw(canvas, palette, PLANET_SIZE, seed);
    // 片側を暗くする陰影は、どの画風にも共通でつける
    drawShade(canvas, PLANET_SIZE);
    canvas.restore();
    surface.flush();

    const snapshot = surface.makeImageSnapshot();
    disposables.push(snapshot);
    return await savePngToCache(`planet-${style.id}`, snapshot.encodeToBytes(ImageFormat.PNG));
  } finally {
    disposables.reverse().forEach((item) => item.dispose());
  }
}

/** 1つの色の一覧から、画風の違う候補を1つずつ作る(並び順は PLANET_STYLES と同じ) */
export async function createPlanetCandidates(
  palette: string[],
  seed: number,
): Promise<PlanetCandidate[]> {
  const startedAt = Date.now();
  const candidates: PlanetCandidate[] = [];
  for (const style of PLANET_STYLES) {
    const imageUri = await renderPlanetPng(palette, style.id, seed);
    candidates.push({ styleId: style.id, label: style.label, imageUri });
  }
  if (__DEV__) {
    console.log(`[photo] 惑星の候補を ${candidates.length} つ作った(${Date.now() - startedAt}ms)`);
  }
  return candidates;
}
