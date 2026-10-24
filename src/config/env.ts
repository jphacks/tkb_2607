// 環境変数は必ずこのファイル経由で読む。
// EXPO_PUBLIC_ の値は Metro が静的に埋め込むので、process.env.XXX と直接書く必要がある。

export type DataMode = 'mock' | 'supabase';

export const env = {
  dataMode: (process.env.EXPO_PUBLIC_DATA_MODE === 'supabase' ? 'supabase' : 'mock') as DataMode,
  demoMode: process.env.EXPO_PUBLIC_DEMO_MODE === 'true',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
};
