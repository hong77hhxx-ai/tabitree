-- Migration: create routes table
-- 最適化したルートに名前を付けて保存し、タイムラインで一覧表示するためのテーブル。
-- 認証なしのため作成者情報(user_id/ニックネーム/アバター)をスナップショット保存する。
-- pin_ids は origin → 経由地(最適化後) → destination の並び順を保持する。

CREATE TABLE IF NOT EXISTS public.routes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  mode text NOT NULL DEFAULT 'DRIVING', -- 'WALKING' | 'DRIVING'
  pin_ids text[] NOT NULL,
  total_distance_m double precision,
  total_duration_s double precision,
  created_by text,
  creator_name text,
  creator_avatar text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for routes"
  ON public.routes FOR ALL USING (true) WITH CHECK (true);
