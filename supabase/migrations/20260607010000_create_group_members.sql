-- Migration: create group_members table
-- 一度でもグループ（マップ）を開いた人を永続的に記録するためのテーブル。
-- member_locations は位置共有が切れると削除されるため、メンバー一覧の元データには使えない。
-- 認証なしのため user_id（localStorageベース）＋ニックネーム＋アバターURLを保持する。

CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id text NOT NULL,
  nickname text,
  avatar_url text,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for group_members"
  ON public.group_members FOR ALL USING (true) WITH CHECK (true);
