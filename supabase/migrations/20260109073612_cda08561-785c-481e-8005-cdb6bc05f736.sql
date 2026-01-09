-- Add institution_uuid to events table for multi-tenancy
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS institution_uuid uuid REFERENCES public.institutions(id);

-- Add status column if not exists (user mentioned they added it, but ensuring it exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'status') THEN
    ALTER TABLE public.events ADD COLUMN status text DEFAULT 'draft';
  END IF;
END $$;

-- Create index for faster institution-based queries
CREATE INDEX IF NOT EXISTS idx_events_institution_uuid ON public.events(institution_uuid);