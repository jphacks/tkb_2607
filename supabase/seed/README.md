# ダミーデータ(デモ・開発用)

誰がアプリを開いても、ホームに惑星が並んでいる状態にするためのダミーユーザー12人です。
土台担当が、Supabase に流します(ほかの人は流さなくてよい)。

| ファイル | 中身 |
| --- | --- |
| `dummies.sql` | ダミーのプロフィール・惑星・衛星・タグと、ダミーではない全員とのすれ違い |
| `dummy-images/planets/` | 惑星の画像(Figma の水彩の惑星を、アプリの惑星画像と同じ形式で書き出したもの。512px・背景透明・本体は直径の94%) |
| `dummy-images/satellites/` | 衛星の画像(Figma の衛星を書き出したもの。背景透明) |

## 流し方

リポジトリ直下で実行します(`supabase link` 済みであること)。

```bash
# 1. 画像を Storage に置く
npx supabase storage cp -r supabase/seed/dummy-images/planets ss:///planets/dummy --linked --experimental
npx supabase storage cp -r supabase/seed/dummy-images/satellites ss:///satellites/dummy --linked --experimental

# 2. ダミーを入れる(先にダミーを全部消してから入れ直すので、何度流してもよい)
npx supabase db query --linked -f supabase/seed/dummies.sql
```

- 新しく登録した人には、ダミーとのすれ違いが入っていません。入れたいときは、もう一度 2 を流してください。
- ホームの顔ぶれは週に1回だけ選ぶので、2 の最後で全員の今週の顔ぶれを消しています。次にホームを開いたときに選び直されます。

## 消し方

```bash
npx supabase db query --linked "delete from public.profiles where is_dummy"
```

惑星・衛星・タグの付け方・すれ違いも一緒に消えます(画像は Storage に残ります)。
