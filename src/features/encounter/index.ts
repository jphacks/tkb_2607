// すれ違い検知(BLE)の公開窓口。土台担当が実装する。
export { addEncounterLog, useEncounterLog, type EncounterLogEntry } from './log';
export {
  startEncounterDetection,
  stopEncounterDetection,
  useEncounterDetection,
  useEncounterDetectionState,
  type BleLogEntry,
  type EncounterDetectionState,
} from './detection';
export { isBleAvailable, type BleStatus } from './native-ble';
