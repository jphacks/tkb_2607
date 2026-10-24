// Supabase クライアント。src/data/supabase/ からだけ import すること(ESLint で制限している)。
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { env } from '@/config/env';

import type { Database } from './database.types';

let client: SupabaseClient<Database> | null = null;

/** supabase モードのときだけ作る(mock モードでは URL が空でもアプリが動くように) */
export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;
  if (!env.supabaseUrl || !env.supabaseKey) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY が .env にありません',
    );
  }
  client = createClient<Database>(env.supabaseUrl, env.supabaseKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  // アプリが前面にあるときだけトークンを自動更新する(Supabase の推奨)
  const supabase = client;
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });

  return client;
}
