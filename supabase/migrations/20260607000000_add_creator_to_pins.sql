-- Migration: add creator info columns to pins table
-- ピンを誰が追加したかを表示するため、作成時に作成者情報をスナップショット保存する。
-- 認証なしのため user_id（localStorage）・ニックネーム・アバターURLをそのまま保持する。
-- 既存行があるため NULL 許容。既に手動追加済みでもエラーにならないよう IF NOT EXISTS を付与。

ALTER TABLE public.pins
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS creator_name text,
  ADD COLUMN IF NOT EXISTS creator_avatar text;

COMMENT ON COLUMN public.pins.created_by IS '作成者の user_id（localStorageベース）。null可。';
COMMENT ON COLUMN public.pins.creator_name IS '作成時の作成者ニックネーム。null可。';
COMMENT ON COLUMN public.pins.creator_avatar IS '作成時の作成者アバターURL。null可。';
