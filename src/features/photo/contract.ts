// 写真担当との契約(受け渡しの形)。変えるときは土台担当と写真担当で相談する。
import type { SavePlanetInput } from '@/types/domain';

export type PlanetCreatorProps = {
  /** 惑星ができたら呼ぶ。保存と画面移動は土台がやる */
  onComplete: (result: SavePlanetInput) => Promise<void>;
};

export type SatelliteCreatorProps = {
  /** 衛星の画像ができたら呼ぶ。保存は土台がやる */
  onComplete: (result: { imageUri: string }) => Promise<void>;
};

/** 写真から惑星を作る(画面なしで呼べる。デモ用ダミーの作成にも使う) */
export type GeneratePlanet = (photoUri: string) => Promise<{ imageUri: string; palette: string[] }>;

/** 写真から被写体を切り抜く(画面なしで呼べる) */
export type CutoutSubject = (photoUri: string) => Promise<{ imageUri: string }>;
