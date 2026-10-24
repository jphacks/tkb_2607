# Perigee

JPHucks 2026 のハッカソンアプリ。開発のルールは [CLAUDE.md](./CLAUDE.md)、今の開発ビルドで使えるネイティブ部品は [NATIVE_DEPS.md](./NATIVE_DEPS.md) を参照。

## 準備(最初の1回だけ)

### PC(Windows / Mac)

1. **Node.js 24(LTS)** を入れる。https://nodejs.org から「LTS」をダウンロードしてインストールする。
   入ったかの確認:ターミナル(Windows は PowerShell)で `node -v` を実行し、`v24.x.x` と出れば OK。
2. **Git** を入れる(Windows は https://git-scm.com から)。
3. リポジトリを clone して、依存関係を入れる。
   ```bash
   git clone https://github.com/jphacks/tkb_2607.git
   cd tkb_2607
   npm ci
   ```
   `npm ci` は `package-lock.json` のとおりに入れるコマンド。全員の部品のバージョンがそろう(`npm install` だとずれることがある)。
4. `.env.example` をコピーして `.env` を作る。最初は中身を変えなくてよい(`EXPO_PUBLIC_DATA_MODE=mock`)。
   - Windows(PowerShell):`Copy-Item .env.example .env`
   - Mac:`cp .env.example .env`

### iPhone

1. チームのチャンネルで共有された **開発ビルドのリンク** を、iPhone の Safari で開いてインストールする。
2. 開こうとして「デベロッパモードが必要」と出たら、「設定 → プライバシーとセキュリティ → デベロッパモード」をオンにして再起動する。

## 毎日の起動

```bash
npx expo start
```

1. PC に QR コードが出たら、iPhone のカメラで読む(または開発ビルドのアプリを開き、一覧に出るサーバーをタップする)。
2. コードを保存すると、iPhone の画面がすぐに変わる。ビルドし直しは不要。

モックモードでは、最初からダミーユーザー「わたし」でログインした状態で始まる(ログアウト後は `me@example.com` / `password` でログインできる)。

## 動作確認ラボ

ホーム右上の「ラボ」から開く。他の人の作業を待たずに、自分の担当を実機で試すための画面。

| 画面                   | 使う人     | 内容                                                                   |
| ---------------------- | ---------- | ---------------------------------------------------------------------- |
| ネイティブ部品チェック | 全員       | 新しい開発ビルドを入れたら最初に開く。全部「OK」ならビルドは正常       |
| 引力の練習場           | 引力・描画 | 固定の見本データで `GravityView` を表示する。人数(0/3/12/30)を切り替え |
| 写真の練習場           | 写真       | `PlanetCreator` / `SatelliteCreator` を保存せずに試し、結果を表示する  |
| デバッグ               | 全員       | データのモード、デモ操作、すれ違い検知ログ                             |

練習場の画面は `src/app/(app)/lab/` に自由に追加してよい。

## iPhone とつながらないとき

上から順に試す。

1. **PC と iPhone が同じ Wi-Fi か** 確認する。大学やカフェの Wi-Fi は、端末どうしの通信を禁止していることが多い。スマホのテザリングに PC をつなぐと解決しやすい。
2. **Windows のファイアウォール**:初めて `npx expo start` を実行したときに「アクセスを許可しますか」と出たら、「プライベートネットワーク」にチェックを入れて許可する。拒否してしまったら「Windows セキュリティ → ファイアウォールとネットワーク保護 → ファイアウォールによるアプリケーションの許可」で Node.js を許可する。
3. **それでもだめなら tunnel**:`npx expo start --tunnel`。インターネット経由でつなぐので、どの Wi-Fi でも動く(少し遅い)。
4. **赤い画面やエラーが出る**:`npx expo start --clear` でキャッシュを消して起動し直す。
5. **アプリが起動直後に落ちる/「ネイティブモジュールがない」と出る**:配布中の開発ビルドが古い可能性がある。[NATIVE_DEPS.md](./NATIVE_DEPS.md) の最新のビルドを入れ直す。
6. **ポート 8081 が使われている**と出たら:`npx expo start --port 8082`。

## よく使うコマンド

```bash
npx expo start        # 開発サーバー
npx tsc --noEmit      # 型チェック
npx expo lint         # Lint
npm run format        # Prettier で整形
```

## main に入れる流れ

1. 作業用のブランチを作る(例:`git switch -c photo/planet-generator`)。
2. Claude Code で `/pre-merge` を実行する。チェックのあと、PR の本文を書いてくれる。
3. PR を作る。GitHub Actions が型チェックと Lint を自動で実行する(赤い × が付いたら直す)。
