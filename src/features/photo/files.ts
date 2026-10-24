// 作った画像をキャッシュに保存する。
import { File, Paths } from 'expo-file-system';

/** 同じミリ秒に保存してもファイル名がぶつからないように足す番号 */
let saveCount = 0;

/** PNG のバイト列を、キャッシュに `<prefix>-<時刻>-<番号>.png` で保存して URI を返す */
export async function savePngToCache(prefix: string, bytes: Uint8Array): Promise<string> {
  const file = new File(Paths.cache, `${prefix}-${Date.now()}-${saveCount++}.png`);
  file.create();
  await file.write(bytes);
  return file.uri;
}

/** 使わなくなった画像を消す。消せなくてもアプリの動きには関係ないので、エラーにはしない */
export function deleteCachedFiles(uris: string[]) {
  for (const uri of uris) {
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch (e) {
      if (__DEV__) console.log(`[photo] 画像を消せなかった(${uri}):${String(e)}`);
    }
  }
}
