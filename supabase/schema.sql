-- Create groups table
CREATE TABLE public.groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color text, -- グループ識別用カラー（例: #88D8C0）。null可
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create pins table
CREATE TABLE public.pins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  category text NOT NULL, -- 'Eat', 'Stay', 'Sightseeing', 'Onsen'
  title text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'Planned', -- 'Planned', 'Confirmed', 'Visited'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

-- Create policies (Allow all for this prototype to allow easy sharing without auth)
CREATE POLICY "Allow all operations for groups" ON public.groups FOR ALL USING (true);
CREATE POLICY "Allow all operations for pins" ON public.pins FOR ALL USING (true);

-- Enable Realtime for pins
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pins;
