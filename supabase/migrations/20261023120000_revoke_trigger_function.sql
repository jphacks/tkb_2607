-- handle_new_user は登録時のトリガー専用。アプリから RPC として呼べないようにする。
revoke execute on function public.handle_new_user() from anon, authenticated, public;
