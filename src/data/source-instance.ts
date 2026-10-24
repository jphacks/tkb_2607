import { env } from '@/config/env';

import { mockSource } from './mock';
import type { DataSource } from './source';
import { supabaseSource } from './supabase';

/** EXPO_PUBLIC_DATA_MODE で選ばれた実装 */
export const source: DataSource = env.dataMode === 'supabase' ? supabaseSource : mockSource;
