// Vision(iOS 17 以上)で写真の被写体を切り抜く。ライブラリの呼び出しはこのファイルだけにまとめる。
import { removeBackground } from '@six33/react-native-bg-removal';

/**
 * 被写体だけを残した、背景が透明な PNG の URI を返す(被写体のまわりの余白は切り詰める)。
 * 大きい画像を渡すとライブラリの中でアプリごと落ちることがあるので、必ず縮小後の画像を渡す。
 * Vision で切り抜けなかったときは、理由をメッセージにしたエラーを投げる。
 */
export async function cutoutWithVision(uri: string): Promise<string> {
  let result: string;
  try {
    result = await removeBackground(uri, { trim: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === 'REQUIRES_API_FALLBACK') throw new Error('iOS 17 未満のため Vision が使えない');
    if (message === 'Failed to create mask') throw new Error('被写体が見つからなかった');
    throw new Error(`Vision で切り抜けなかった(${message})`);
  }
  // シミュレーターでは切り抜かずに、渡した URI をそのまま返してくる
  if (result === uri) throw new Error('切り抜かれずに元の画像が返ってきた(シミュレーターなど)');
  return result;
}
