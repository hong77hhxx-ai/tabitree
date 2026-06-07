-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color text, -- グループ識別用カラー（例: #88D8C0）。null可
  photo_url text, -- グループのカバー写真URL。null可
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create pins table
CREATE TABLE IF NOT EXISTS public.pins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  category text NOT NULL, -- 'Eat', 'Stay', 'Sightseeing', 'Onsen', 'Here'
  title text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'Planned', -- 'Planned', 'Confirmed', 'Visited'
  photo_url text, -- ピンの思い出写真URL。null可
  reactions jsonb DEFAULT '{}'::jsonb, -- リアクション（絵文字キーとカウントのペア）。null可
  scheduled_at timestamp with time zone, -- 予定日時。null可
  created_by text, -- 作成者の user_id（localStorageベース）。null可
  creator_name text, -- 作成者のニックネーム。null可
  creator_avatar text, -- 作成者のアバターURL。null可
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create group_members table (永続的なメンバー記録)
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

-- Create routes table (保存済み最適化ルート)
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

-- Create member_locations table (リアルタイム位置共有用、TTL付きで生存)
CREATE TABLE IF NOT EXISTS public.member_locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id text NOT NULL,
  nickname text NOT NULL,
  avatar_url text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (group_id, user_id)
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_locations ENABLE ROW LEVEL SECURITY;

-- Create policies (Allow all operations for prototype sharing)
DROP POLICY IF EXISTS "Allow all operations for groups" ON public.groups;
CREATE POLICY "Allow all operations for groups" ON public.groups FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for pins" ON public.pins;
CREATE POLICY "Allow all operations for pins" ON public.pins FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for group_members" ON public.group_members;
CREATE POLICY "Allow all operations for group_members" ON public.group_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for routes" ON public.routes;
CREATE POLICY "Allow all operations for routes" ON public.routes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for member_locations" ON public.member_locations;
CREATE POLICY "Allow all operations for member_locations" ON public.member_locations FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for pins and member_locations
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.member_locations;

-- Create storage bucket for photos and avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('pin-photos', 'pin-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Allow public select on pin-photos" ON storage.objects;
CREATE POLICY "Allow public select on pin-photos" ON storage.objects FOR SELECT USING (bucket_id = 'pin-photos');

DROP POLICY IF EXISTS "Allow public insert on pin-photos" ON storage.objects;
CREATE POLICY "Allow public insert on pin-photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pin-photos');

DROP POLICY IF EXISTS "Allow public update on pin-photos" ON storage.objects;
CREATE POLICY "Allow public update on pin-photos" ON storage.objects FOR UPDATE USING (bucket_id = 'pin-photos') WITH CHECK (bucket_id = 'pin-photos');

DROP POLICY IF EXISTS "Allow public delete on pin-photos" ON storage.objects;
CREATE POLICY "Allow public delete on pin-photos" ON storage.objects FOR DELETE USING (bucket_id = 'pin-photos');
