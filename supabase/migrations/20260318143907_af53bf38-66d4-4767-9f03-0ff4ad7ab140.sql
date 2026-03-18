
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'face2face';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location_address text;
