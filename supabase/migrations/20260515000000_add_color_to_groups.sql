-- Migration: add `color` column to groups table
-- マップ一覧でグループごとの識別色を表示するために使用する。
-- 既存行があるため NULL 許容（アプリ側で null の場合は既定色を表示）。
-- 既に手動で追加済みの環境でもエラーにならないよう IF NOT EXISTS を付与。

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS color text;

COMMENT ON COLUMN public.groups.color IS 'グループ識別用のカラー（例: #88D8C0）。null可。';
