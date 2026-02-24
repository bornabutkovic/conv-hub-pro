-- Remove the overly permissive public SELECT policy on events
-- The existing "events_select" policy already enforces proper institution-scoped access
DROP POLICY IF EXISTS "Public can view events" ON public.events;