# CLAUDE.md — Perigee(JPHucks 2026)

@AGENTS.md

応答・コメント・コミットメッセージ・PR の文章は日本語で書く(コード上の識別子は英語)。
メンバーの多くは初心者なので、専門用語には「アプリでどう違いが出るか」を一言添える。

## 1. アプリの概要

「まだ仲良くないが、身近にいる人(顔見知り未満)」と仲良くなるきっかけ(0→1)をつくるアプリ。

- ユーザーは自分を表す **惑星** を1つ持つ。好きなものの写真の色から、水彩風の惑星を生成する。
- **衛星**:好きなものの写真を切り抜いたもの。ホームでは3つまで惑星の周りに出る。
- **タグ**:大学名・サークル名・職場など。
- **引力**:タグの重なりと、BLE で検知した **すれ違い回数** から計算する。関係が強い人ほど自分の近くに来る。仕組みはユーザーに見せない。
- 期限:2026-10-24 に実装完了、10-25 に発表。iOS のみ(Android・プッシュ通知・ブロック/通報・App Store 公開はやらない)。

## 2. 技術スタック(確定)

| 領域           | 採用                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------- |
| アプリ         | Expo SDK 58 / React Native / TypeScript、Expo Router(`src/app/`)                          |
| 実機確認       | 開発ビルド(expo-dev-client)+ EAS の内部配布。Expo Go は使わない                           |
| データ取得     | TanStack Query(`src/data/` の中だけで使う)                                                |
| バックエンド   | Supabase(Auth はメール+パスワード、メール確認はオフ)                                      |
| 描画           | @shopify/react-native-skia + react-native-reanimated                                      |
| 写真           | expo-image-picker / expo-image-manipulator / expo-file-system / react-native-image-colors |
| その他         | expo-image、expo-haptics、expo-audio、d3-force                                            |
| Lint / 整形    | `npx expo lint`(ESLint)+ Prettier                                                         |
| パッケージ管理 | npm(追加は必ず `npx expo install`)                                                        |

開発 PC はほぼ Windows(Mac は土台担当の1台)。Mac がないとできない手順を前提にしない。

## 3. 役割分担

| 担当           | フォルダ                                                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 土台担当       | `src/app/`、`src/data/`、`src/types/`、`src/lib/`、`src/config/`、`src/components/`、`supabase/`、ビルド・配布、BLE(`src/features/encounter/`) |
| 引力・描画担当 | `src/features/gravity/`                                                                                                                        |
| 写真担当       | `src/features/photo/`                                                                                                                          |

`src/features/*/contract.ts` が土台との **契約(受け渡しの形)**。`src/features/*/index.ts` が公開窓口で、土台はここからだけ import する。

## 4. 作業ルール(Claude Code が必ず守ること)

1. **新規追加は自由**:どのフォルダでも、新しい型・フック・処理・画面を追加してよい。追加する前に、同じ役割のものがないか検索する。動作確認用の画面は `src/app/(app)/lab/` に置き、`lab/index.tsx` の一覧に1行足す(この一覧への追記は誰でもしてよい)。
2. **担当フォルダの外にある既存コードを変更・削除する前に**、次をユーザーに説明して了承を取る。
   - 何を変えるか
   - 使用箇所の検索結果と、どの担当のコードに影響するか
   - 既存を変えずに、新しく追加するだけで済まないか
     特に `src/types/domain.ts` の型への必須項目の追加・削除・名前変更、契約(`contract.ts`)の変更、`src/data/index.ts` の公開フックの引数・戻り値の変更は、他の人のコードを壊しやすい。
3. **次は新規追加でも土台担当に連絡が必要**:ネイティブ部品の追加・削除・更新、`app.json` / `eas.json` の変更、`supabase/` の変更、`src/lib/supabase.ts` の変更。ネイティブ部品を変えると開発ビルドの作り直しになる(EAS の無料枠は iOS 月15回)。今のビルドで使えるネイティブ部品は `NATIVE_DEPS.md` を見る。そこにない部品は使えない前提で実装を考える。ビルドで入れる部品が変わったら `NATIVE_DEPS.md` も更新する。
4. **機能(`src/features/`)と画面(`src/app/`)から Supabase を直接 import しない**。データは `@/data` のフック・関数経由で読み書きする(ESLint で禁止している)。
5. 作業を終える前に `npx tsc --noEmit` と `npx expo lint` を通す。
6. main に入れる前(PR を作る前)は `/pre-merge` を実行し、PR の本文もそれに書かせる。PR の本文がチームの作業ログになる。
7. 分からない仕様は推測で埋めず、ユーザーに確認する。

## 5. データ層の使い方

- `EXPO_PUBLIC_DATA_MODE=mock` ならダミーデータ(`src/data/mock/`)、`supabase` なら本物の Supabase につながる。どちらでも同じフックが使える。
- 実装の窓口は `src/data/source.ts` の `DataSource`。mock と supabase の両方を実装する。
- 新しいデータが欲しいときは、`DataSource` にメソッドを足し、mock の実装とフック(`src/data/index.ts`)を書く。Supabase 側の実装やテーブルが必要なら土台担当に依頼する。
- 環境変数は `src/config/env.ts` からだけ読む。

## 6. DB(Supabase)

- スキーマの変更は必ず `supabase/migrations/` に SQL で残す(ダッシュボードでの手作業変更はしない)。
- 反映(`npx supabase db push`)は土台担当が行う。反映済みのマイグレーションは書き換えず、新しいファイルを足す。
- DB の型は `src/lib/database.types.ts`(自動生成。手で編集しない)。スキーマを変えたら `npm run gen:types` で作り直す。
- Supabase は東京リージョン(project ref:`orhkiksbddaqaykgjmgp`)。
- 全テーブルで RLS を有効にする。本名(`private_profiles`)は本人しか読めない。
- 主なテーブル:`profiles` / `private_profiles` / `planets` / `satellites` / `tags` / `user_tags` / `ble_tokens` / `encounters`
- 主な RPC:`set_my_tags` / `issue_ble_token` / `report_encounter` / `get_home_candidates` / `demo_add_encounter`
- `profiles.is_dummy = true` はデモ用のダミー。`delete from profiles where is_dummy` で一括削除できる。
- Storage:`planets` / `satellites` / `sounds`(公開バケット。パスは `<user_id>/<ファイル名>`)。

## 7. 未決事項

| 未決事項               | 今の扱い                                                                       |
| ---------------------- | ------------------------------------------------------------------------------ |
| 引力スコアの計算場所   | 端末で計算する想定。`get_home_candidates` は計算材料を返し、`score` は任意項目 |
| 切り抜きの方式         | 写真担当が調査中(Vision を使うなら 10/23 のビルドに入れる)                     |
| BLE の方式・ライブラリ | 自作の Expo モジュール(`modules/perigee-ble`)に決定。実機2台での検証中         |
| 本名の開示条件         | P1。開示は後で RPC として追加する                                              |

## 8. 秘密情報

- `.env` はコミットしない(`.env.example` だけコミットする)。
- アプリに入れてよいのは Supabase の URL と publishable(anon)key だけ。**service_role key はアプリに絶対に入れない。**
