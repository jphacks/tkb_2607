// すれ違い検知の司令塔。ネイティブ(BLE)とデータ層(@/data)の間をつなぐ。
//
// - 一時ID(トークン)をサーバーから取り、期限が切れる前に取り直してネイティブに渡す
// - ネイティブが検知した相手のトークンを、サーバーに報告する(report_encounter)
// - 報告に失敗した分は、アプリを開き直したときに送り直す
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, type NativeEventSubscription } from 'react-native';

import { getBleToken, reportEncounter } from '@/data';
import type { BleToken, EncounterReport } from '@/types/domain';

import { addEncounterLog } from './log';
import { isBleAvailable, nativeBle, type BleEncounterEvent, type BleStatus } from './native-ble';

/** サーバー(report_encounter)のしきい値と同じ。これより弱い電波は端末側で捨てる */
const MIN_RSSI = -85;
/** 同じ相手を検知したあと、ネイティブ側で次に検知するまで空ける秒数 */
const COOLDOWN_SEC = 60;
/** トークンの期限がこれより近づいたら取り直す */
const TOKEN_REFRESH_MARGIN_MS = 3 * 60 * 1000;
/** 同じトークンを報告し直さない時間(トークンは15分で切り替わる) */
const SAME_TOKEN_SKIP_MS = 15 * 60 * 1000;
const MAX_RETRY_QUEUE = 50;
/** 開始に失敗したとき(起動直後に通信できないなど)、やり直すまでの時間 */
const START_RETRY_MS = 30 * 1000;
const MAX_NATIVE_LOGS = 100;

export type BleLogEntry = { id: string; message: string; at: string };

export type EncounterDetectionState = {
  /** 今の開発ビルドに BLE モジュールが入っているか */
  available: boolean;
  /** 検知を動かす指示が出ているか(開始に失敗してやり直し待ちの間も true) */
  active: boolean;
  /** 開始・停止の処理中か(この間はボタンを押せなくする) */
  busy: boolean;
  status: BleStatus | null;
  myToken: string | null;
  /** 送信待ち(通信に失敗した報告)の数 */
  pendingReports: number;
  error: string | null;
  /** ネイティブ側のログ(新しい順、端末のメモリ上だけ) */
  nativeLogs: BleLogEntry[];
};

// ---------- 画面に見せる状態 ----------

let state: EncounterDetectionState = {
  available: isBleAvailable,
  active: false,
  busy: false,
  status: null,
  myToken: null,
  pendingReports: 0,
  error: null,
  nativeLogs: [],
};
const listeners = new Set<() => void>();

function setState(patch: Partial<EncounterDetectionState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

// ---------- 内部の状態 ----------

/** 検知を動かす指示が出ているか(start から stop まで) */
let wanted = false;
/** 実際に動いているか(開始に失敗すると wanted のまま false になる) */
let running = false;
/** start / stop が重なったときに、古い処理の続きを捨てるための番号 */
let generation = 0;
let currentToken: BleToken | null = null;
/** 取得中のトークン。同時に何回頼まれても、サーバーへの問い合わせは1回にまとめる */
let tokenRequest: Promise<BleToken> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let restartTimer: ReturnType<typeof setTimeout> | null = null;
let nativeSubscriptions: { remove(): void }[] = [];
let appStateSubscription: NativeEventSubscription | null = null;
const reportedAt = new Map<string, number>();
let retryQueue: EncounterReport[] = [];

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** すれ違い検知を始める。BLE モジュールがないビルドでは何もしない */
export async function startEncounterDetection() {
  if (!nativeBle || running) return;
  wanted = true;
  running = true;
  clearRestartTimer();
  const myGeneration = ++generation;
  setState({ active: true, busy: true });
  subscribe();
  try {
    const token = await refreshToken(true);
    if (myGeneration !== generation) return;
    await nativeBle.start({
      token: token.token,
      minRssi: MIN_RSSI,
      useGatt: true,
      cooldownSec: COOLDOWN_SEC,
    });
    if (myGeneration !== generation) return;
    setState({ error: null, busy: false, status: nativeBle.getStatus() });
  } catch (error) {
    if (myGeneration !== generation) return;
    running = false;
    unsubscribe();
    setState({
      error: `開始できませんでした(30秒後にやり直します): ${errorMessage(error)}`,
      busy: false,
    });
    // 起動直後に通信できなかったときなど。止める指示が出るまで、時間をおいてやり直す
    restartTimer = setTimeout(() => {
      restartTimer = null;
      if (wanted) void startEncounterDetection();
    }, START_RETRY_MS);
  }
}

/** すれ違い検知を止める(ログアウト時など) */
export async function stopEncounterDetection() {
  if (!nativeBle || !wanted) return;
  wanted = false;
  running = false;
  const myGeneration = ++generation;
  clearRestartTimer();
  unsubscribe();
  currentToken = null;
  tokenRequest = null;
  // 次に別のアカウントでログインしたとき、前の人の報告を送らないように捨てる
  retryQueue = [];
  reportedAt.clear();
  setState({ active: false, busy: true, myToken: null, pendingReports: 0 });
  await nativeBle.stop();
  if (myGeneration !== generation) return;
  setState({ busy: false, status: nativeBle.getStatus() });
}

function clearRestartTimer() {
  if (restartTimer) clearTimeout(restartTimer);
  restartTimer = null;
}

// ---------- トークン ----------

function refreshToken(force = false): Promise<BleToken> {
  if (
    !force &&
    currentToken &&
    Date.parse(currentToken.validUntil) - Date.now() > TOKEN_REFRESH_MARGIN_MS
  ) {
    return Promise.resolve(currentToken);
  }
  if (!tokenRequest) {
    const request = fetchToken().finally(() => {
      if (tokenRequest === request) tokenRequest = null;
    });
    tokenRequest = request;
  }
  return tokenRequest;
}

async function fetchToken(): Promise<BleToken> {
  const myGeneration = generation;
  const token = await getBleToken();
  // 待っている間に止められたら結果を使わない(止めたあとにタイマーが動き出さないように)
  if (myGeneration !== generation) return token;
  const changed = token.token !== currentToken?.token;
  currentToken = token;
  if (changed && running) nativeBle?.updateToken(token.token);
  setState({ myToken: token.token });
  scheduleRefresh(token);
  return token;
}

// アプリを開いている間はタイマーで取り直す。
// バックグラウンドではタイマーが止まるので、検知で起こされたときと、開き直したときにも取り直す。
function scheduleRefresh(token: BleToken) {
  if (refreshTimer) clearTimeout(refreshTimer);
  const delay = Math.max(
    30 * 1000,
    Date.parse(token.validUntil) - Date.now() - TOKEN_REFRESH_MARGIN_MS,
  );
  refreshTimer = setTimeout(() => {
    refreshToken().catch((error) =>
      setState({ error: `トークンを更新できませんでした: ${errorMessage(error)}` }),
    );
  }, delay);
}

// ---------- 検知と報告 ----------

async function handleEncounter(event: BleEncounterEvent) {
  refreshToken().catch(() => {});

  const now = Date.now();
  const last = reportedAt.get(event.token);
  if (last !== undefined && now - last < SAME_TOKEN_SKIP_MS) return;
  // トークンは15分で切り替わるので、それより古い記録はもう使わない
  for (const [token, at] of reportedAt) {
    if (now - at >= SAME_TOKEN_SKIP_MS) reportedAt.delete(token);
  }
  reportedAt.set(event.token, now);

  const myGeneration = generation;
  await send({ token: event.token, rssi: event.rssi, detectedAt: event.detectedAt }, myGeneration);
  await flushRetryQueue();
}

async function send(report: EncounterReport, myGeneration: number): Promise<boolean> {
  try {
    const result = await reportEncounter(report);
    addEncounterLog({ ...report, result: result.reason });
    return true;
  } catch {
    addEncounterLog({ ...report, result: 'error' });
    // 送っている間に止められた(ログアウトなど)ら、送り直しの対象にしない
    if (myGeneration !== generation) return false;
    retryQueue = [...retryQueue, report].slice(-MAX_RETRY_QUEUE);
    setState({ pendingReports: retryQueue.length });
    return false;
  }
}

async function flushRetryQueue() {
  if (retryQueue.length === 0) return;
  const myGeneration = generation;
  const queue = retryQueue;
  retryQueue = [];
  setState({ pendingReports: 0 });
  for (const report of queue) {
    // 途中で止められたら、残りは送らない(次にログインした人の分として送らないため)
    if (myGeneration !== generation) return;
    // send が失敗した分は、send の中でまたキューに戻る
    await send(report, myGeneration);
  }
}

// ---------- イベントの購読 ----------

function subscribe() {
  if (!nativeBle || nativeSubscriptions.length > 0) return;
  nativeSubscriptions = [
    nativeBle.addListener('onEncounter', (event) => {
      void handleEncounter(event);
    }),
    nativeBle.addListener('onStatusChange', (status) => setState({ status })),
    nativeBle.addListener('onLog', ({ message, at }) => {
      const entry = { id: `${at}-${Math.random()}`, message, at };
      setState({ nativeLogs: [entry, ...state.nativeLogs].slice(0, MAX_NATIVE_LOGS) });
    }),
  ];
  appStateSubscription = AppState.addEventListener('change', (appState) => {
    if (appState !== 'active' || !running) return;
    refreshToken().catch(() => {});
    void flushRetryQueue();
  });
  setState({ status: nativeBle.getStatus() });
}

function unsubscribe() {
  nativeSubscriptions.forEach((subscription) => subscription.remove());
  nativeSubscriptions = [];
  appStateSubscription?.remove();
  appStateSubscription = null;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
}

// ---------- フック ----------

/** enabled が true の間だけ、すれ違い検知を動かす。ログイン後の画面の土台で1回だけ呼ぶ */
export function useEncounterDetection(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    void startEncounterDetection();
    return () => {
      void stopEncounterDetection();
    };
  }, [enabled]);
}

/** 検知の状態(動作確認用の画面で使う) */
export function useEncounterDetectionState(): EncounterDetectionState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}
