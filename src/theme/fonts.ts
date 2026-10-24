// アプリで使うフォント。名前(キー)は tokens.ts の fontFamily と一致させる。
// 使う太さだけを読み込む(全部読み込むとアプリが重くなる)
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';

export const appFonts = { Inter_400Regular, Inter_500Medium, Inter_700Bold };
