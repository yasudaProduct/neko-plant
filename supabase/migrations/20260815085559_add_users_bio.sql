-- ユーザープロフィールの自己紹介 (任意)。
-- 文字数上限 (MAX_USER_BIO_LENGTH) はアプリ側 (Server Action) で検証する。
-- RLS・ポリシー・一意インデックスの変更はないため pgTAP 構造テストの更新は不要。
alter table public.users add column bio varchar;
