-- Storage の上書きアップロード(upsert)と削除には、追加・更新・削除に加えて「読む」権限も必要。
-- 自分のフォルダのファイルだけ読めるようにする(表示は公開 URL なので、他人の画像の表示には影響しない)。
create policy "storage: 自分のフォルダを読める" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('planets', 'satellites', 'sounds')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
