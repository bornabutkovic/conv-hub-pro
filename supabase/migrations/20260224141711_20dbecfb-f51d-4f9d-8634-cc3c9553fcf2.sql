
-- 1. Add city, postal_code, country columns to institutions
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS country text DEFAULT 'Hrvatska';

-- 2. Fix RLS on ticket_tiers: drop old policies and create institution-scoped ones
DROP POLICY IF EXISTS "Admins manage ticket tiers" ON public.ticket_tiers;
DROP POLICY IF EXISTS "Admins manage tickets" ON public.ticket_tiers;

CREATE POLICY "ticket_tiers_manage" ON public.ticket_tiers
  FOR ALL TO authenticated
  USING (
    public.is_admin_user(auth.uid())
    OR (event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.institution_uuid IN (
        SELECT p.institution_uuid FROM public.profiles p WHERE p.id = auth.uid()
      )
    ))
  )
  WITH CHECK (
    public.is_admin_user(auth.uid())
    OR (event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.institution_uuid IN (
        SELECT p.institution_uuid FROM public.profiles p WHERE p.id = auth.uid()
      )
    ))
  );

-- 3. Fix RLS on event_services: drop old policies and create institution-scoped ones
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.event_services;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.event_services;
DROP POLICY IF EXISTS "Manage event services by institution or admin" ON public.event_services;

CREATE POLICY "event_services_select" ON public.event_services
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user(auth.uid())
    OR (event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.institution_uuid IN (
        SELECT p.institution_uuid FROM public.profiles p WHERE p.id = auth.uid()
      )
    ))
  );

CREATE POLICY "event_services_manage" ON public.event_services
  FOR ALL TO authenticated
  USING (
    public.is_admin_user(auth.uid())
    OR (event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.institution_uuid IN (
        SELECT p.institution_uuid FROM public.profiles p WHERE p.id = auth.uid()
      )
    ))
  )
  WITH CHECK (
    public.is_admin_user(auth.uid())
    OR (event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.institution_uuid IN (
        SELECT p.institution_uuid FROM public.profiles p WHERE p.id = auth.uid()
      )
    ))
  );
