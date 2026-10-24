// 自作ネイティブモジュール(modules/perigee-ble)の型つき窓口。
// 2回目以前の開発ビルドにはこのモジュールが入っていないので、その場合は null になる(アプリは落ちない)。
import { NativeModule, requireOptionalNativeModule } from 'expo';

export type BleManagerState =
  'off' | 'unknown' | 'resetting' | 'unsupported' | 'unauthorized' | 'poweredOff' | 'poweredOn';

export type BleStatus = {
  running: boolean;
  /** Bluetooth の許可。notDetermined = まだ聞いていない */
  authorization: 'notDetermined' | 'restricted' | 'denied' | 'allowedAlways' | 'unknown';
  /** 受信側(相手を探す) */
  central: BleManagerState;
  /** 発信側(自分の一時IDを知らせる) */
  peripheral: BleManagerState;
  scanning: boolean;
  advertising: boolean;
  /** 接続してIDを読んでいる途中の相手の数 */
  connecting: number;
};

export type BleEncounterEvent = {
  token: string;
  rssi: number;
  detectedAt: string;
  /** advertisement = 広告の名前から読んだ(相手がアプリを開いている)、gatt = 接続して読んだ */
  via: 'advertisement' | 'gatt';
};

export type BleLogEvent = {
  message: string;
  at: string;
};

export type BleStartOptions = {
  token: string;
  minRssi?: number;
  useGatt?: boolean;
  cooldownSec?: number;
};

type PerigeeBleEvents = {
  onEncounter(event: BleEncounterEvent): void;
  onStatusChange(status: BleStatus): void;
  onLog(event: BleLogEvent): void;
};

declare class PerigeeBleModule extends NativeModule<PerigeeBleEvents> {
  start(options: BleStartOptions): Promise<void>;
  updateToken(token: string): void;
  stop(): Promise<void>;
  getStatus(): BleStatus;
}

export const nativeBle = requireOptionalNativeModule<PerigeeBleModule>('PerigeeBle');

/** 今の開発ビルドで BLE が使えるか */
export const isBleAvailable = nativeBle !== null;
