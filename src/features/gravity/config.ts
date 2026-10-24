// 引力の計算に使うパラメータをここに集約する。
// デモ中のチューニングはこのファイルの数値を変えるだけで完結させる(アルゴリズム自体は変えない)。
// ここにある数値はすべて暫定値。妥当性が検証された値ではなく、動作確認をしながら調整する前提。

export const GRAVITY_CONFIG = {
  /**
   * 3つの入力の重み。合計が1になるようにしておくと、最終スコアも 0〜1 に収まりやすい。
   * 優先度:すれ違い回数 > タグ類似度 > 所属団体
   */
  weights: {
    encounter: 0.5,
    tagSimilarity: 0.3,
    organization: 0.2,
  },

  /**
   * すれ違い回数を対数スケールで 0〜1 に正規化する。
   * saturationCount 回以上はすべて saturationCount 回とみなす(DB も16回目以降は記録しない前提)。
   */
  encounterNormalization: {
    saturationCount: 15,
  },

  /** 名前ラベルを出すのは、すれ違いがこの回数以上の人だけ */
  labelMinEncounters: 5,

  /** 惑星・半径まわりの見た目のパラメータ */
  layout: {
    planetSize: 56,
    /** 中心に出す自分の惑星の直径(Figma の B01 に合わせた) */
    mePlanetSize: 94,
    /** 中心からの最小半径 = planetSize * minRadiusFactor */
    minRadiusFactor: 1.5,
  },

  /**
   * 惑星の角度(中心から見た方向)の決め方。angular-layout.ts で使う。
   * 角度は顔ぶれが変わる週次更新のときだけ計算し直し、30分ごとの距離の更新では固定する。
   */
  angular: {
    /**
     * 角度の決め方。
     * - 'rails-jitter':放射状のレール+ひまわりの順番で割り当て+少しずらす(採用)
     * - 'rails':レール+ひまわりの順番で割り当て(ずらさない)
     * - 'golden':強さ順位 i の人を i × 黄金角(約137.5°)に置く(レールなし)
     */
    mode: 'rails-jitter' as AngularMode,
    /** 1位の人を置く方向(ラジアン)。-π/2 = 真上 */
    startAngle: -Math.PI / 2,
    /** レールからのずらし幅。レールの間隔に対する割合(0.15 = ±15%) */
    jitterFactor: 0.15,
    /** 半径の差がこの値(px)より小さい隣どうしを「似ている」とみなす */
    similarRadiusPx: 40,
    /** 惑星の中心どうしが planetSize × この値 より近いと「重なっている」とみなす */
    overlapMarginFactor: 1.1,
    /** 入れ替えで減らしたい悪さの重み。重なりを優先して大きくする */
    overlapWeight: 10,
    similarityWeight: 1,
    /** 入れ替えの最大回数 */
    maxSwapIterations: 50,
  },
} as const;

export type AngularMode = 'rails-jitter' | 'rails' | 'golden';
