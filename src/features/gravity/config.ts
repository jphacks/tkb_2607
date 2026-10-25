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

  /** 名前ラベルを出すのは、すれ違いがこの回数以上の人だけ(0 で全員に出す) */
  labelMinEncounters: 0,

  /**
   * ホームに出す惑星の最大人数。これより多いと一番外側の円で重なるため、
   * 顔ぶれの並び順(週1回選んだときの関係の強さの順)で先頭からこの人数だけ出す
   */
  maxVisiblePlanets: 13,

  /** ズーム・パン(viewport.ts)。拡大率は「背景画像に合わせた等倍」を 1 とする */
  viewport: {
    /**
     * 拡大率の範囲。端で見切れている惑星があるときは、全員が丸ごと見えるところまで
     * minZoom より小さく縮小できる(viewport.ts の fitZoomFor)
     */
    minZoom: 1,
    maxZoom: 3,
    /** 惑星の見た目の拡大率はこの範囲にとどめる(超えた分は惑星の間だけが広がる) */
    planetZoomMin: 1,
    planetZoomMax: 1.6,
    /** 全員が見えるまで縮小するとき、画面の端から空ける余白(px) */
    fitMargin: 8,
    /**
     * 全員が見えるまで縮小するときでも、これより小さくはしない。
     * 背景の星は B01 のフレームの縦横2倍の範囲(土台の DECORATION_BOUNDS)にしか置いていないので、
     * 0.5 倍より小さくすると星のない帯が見える
     */
    minFitZoom: 0.5,
  },

  /**
   * 惑星・半径まわりの見た目のパラメータ。長さはすべてデザイン上の px(home-layout.ts の DESIGN_FRAME 基準)。
   * 画面には、背景画像と同じ倍率で拡大・縮小して描く。自分の惑星の大きさは home-layout.ts の ME_SLOT を使う。
   * 最大半径(どこまで遠くに置けるか)は、端末で実際に見えている範囲の端で決まるので、縦横比の違う端末では少し変わる
   */
  layout: {
    planetSize: 56,
    /** 中心からの最小半径 = planetSize * minRadiusFactor */
    minRadiusFactor: 1.5,
    /**
     * はみ出しの許容。惑星の中心は、端末で見えている範囲の上下左右の端から planetSize × この値 までなら外に出てよい
     * (0 で中心が画面の端まで。0.2 なら惑星の約25%以上は画面に入る)。
     * 四隅は角を丸めて制限し、斜めの方向でも約25%以上は画面に入るようにする。
     * 大きいほど、関係の弱い人が画面の外寄りに広がる
     */
    visibleMarginFactor: 0.2,
    /**
     * 距離を決める強さに、強さの順位をどれだけ混ぜるか(0〜1。範囲の外の値は 0〜1 に収める)。
     * 0 で強さの値そのまま、1 で順位だけ(1位が一番近く、最下位が一番遠い)。
     * 全員の強さが似ているときに、輪のように一列に並ぶのを防ぐ
     */
    rankBlend: 0,
    /**
     * 名前ラベル(土台の PlanetNode が惑星の下に出す)の、惑星とのすき間と高さ(px)。
     * ラベルを出す惑星は、下の方向だけ、ラベルまで画面に入る位置までにする
     */
    label: { gap: 4, height: 16 },
  },

  /**
   * 惑星を置かない範囲(ホーム画面の右上のボタンと左下のピル)。惑星がボタンの下に入ってタップしにくくならないように。
   * 値は画面の pt で、ホーム画面(src/app/(app)/index.tsx)の styles から決めた。ボタンやピルの位置・大きさが変わったら合わせる
   */
  avoidAreas: {
    /** 右上のボタン2つ(38px の丸 × 2 + 間 11px)。top はセーフエリア(ノッチ)の下から */
    topRightButtons: { right: 17, top: 8, width: 87, height: 38 },
    /** 左下の「◯ stars nearby」のピル(幅は文字の長さで変わるので、少し広めにしてある) */
    bottomLeftPill: { left: 21, bottom: 32, width: 140, height: 27 },
    /** 避ける範囲と、惑星のふちの間に空けるすき間(px) */
    padding: 6,
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
