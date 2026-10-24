// 【仮実装】土台が動作確認のために置いたもの。写真担当が中身を作り替える。
// 今は「縮小して PNG にする」だけで、水彩の惑星生成や切り抜きはしていない。
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import ImageColors from 'react-native-image-colors';

import type { CutoutSubject, GeneratePlanet } from './contract';

const MAX_SIZE = 512;

async function resizeToPng(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: MAX_SIZE, height: null });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.PNG });
  return result.uri;
}

async function extractPalette(uri: string): Promise<string[]> {
  const result = await ImageColors.getColors(uri, { fallback: '#999999' });
  if (result.platform === 'ios') {
    return [result.primary, result.secondary, result.detail, result.background];
  }
  if (result.platform === 'android') {
    return [result.vibrant, result.dominant, result.muted, result.average].filter(
      (c): c is string => !!c,
    );
  }
  return ['#999999'];
}

export const generatePlanet: GeneratePlanet = async (photoUri) => {
  const [imageUri, palette] = await Promise.all([resizeToPng(photoUri), extractPalette(photoUri)]);
  return { imageUri, palette };
};

export const cutoutSubject: CutoutSubject = async (photoUri) => {
  return { imageUri: await resizeToPng(photoUri) };
};
