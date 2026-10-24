import { useSyncExternalStore } from 'react';

import type { EncounterReportResult } from '@/types/domain';

/** デバッグ画面に出す検知ログ(端末のメモリ上だけ。アプリを再起動すると消える) */
export type EncounterLogEntry = {
  id: string;
  detectedAt: string;
  token: string;
  rssi: number;
  result: EncounterReportResult['reason'] | 'pending' | 'error';
};

const MAX_ENTRIES = 200;
let entries: EncounterLogEntry[] = [];
const listeners = new Set<() => void>();

export function addEncounterLog(entry: Omit<EncounterLogEntry, 'id'>) {
  entries = [{ ...entry, id: `${Date.now()}-${Math.random()}` }, ...entries].slice(0, MAX_ENTRIES);
  listeners.forEach((listener) => listener());
}

export function useEncounterLog(): EncounterLogEntry[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => entries,
  );
}
