-- Migration: add `photo_url` column to groups table
-- マップグループごとにカバー写真を設定できるようにするために使用する。
-- 既存行があるため NULL 許容（アプリ側で null の場合はカラー表示にフォールバック）。
-- 既に手動で追加済みの環境でもエラーにならないよう IF NOT EXISTS を付与。

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS photo_url text;

COMMENT ON COLUMN public.groups.photo_url IS 'グループのカバー写真URL。null可（その場合はカラー表示）。';
