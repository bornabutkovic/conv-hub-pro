
-- Step 1: Migrate existing status values to new lifecycle
-- 'published' -> 'active', 'past' -> 'completed'
UPDATE public.events SET status = 'active' WHERE status = 'published';
UPDATE public.events SET status = 'completed' WHERE status = 'past';

-- Step 2: Add a CHECK constraint to enforce valid statuses
ALTER TABLE public.events
  ADD CONSTRAINT events_status_check
  CHECK (status IN ('draft', 'pending_approval', 'active', 'completed'));

-- Step 3: Enable pg_cron and pg_net extensions for automatic completion
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Step 4: Create a function to auto-complete past events
CREATE OR REPLACE FUNCTION public.auto_complete_past_events()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.events
  SET status = 'completed'
  WHERE status = 'active'
    AND end_date IS NOT NULL
    AND end_date < now();
$$;

-- Step 5: Schedule the cron job to run every hour
SELECT cron.schedule(
  'auto-complete-past-events',
  '0 * * * *',
  $$SELECT public.auto_complete_past_events()$$
);
