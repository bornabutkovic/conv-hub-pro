
-- Drop all existing restrictive policies on attendees
DROP POLICY IF EXISTS "Allow authenticated users to read attendees" ON public.attendees;
DROP POLICY IF EXISTS "Allow authenticated users to update scanned_at" ON public.attendees;
DROP POLICY IF EXISTS "Insert attendees by institution or admin" ON public.attendees;
DROP POLICY IF EXISTS "Public Read Access" ON public.attendees;
DROP POLICY IF EXISTS "Public Update Access" ON public.attendees;
DROP POLICY IF EXISTS "Public access for dev" ON public.attendees;
DROP POLICY IF EXISTS "View attendees by institution or admin" ON public.attendees;

-- Recreate as PERMISSIVE policies

-- SELECT: institution-scoped or admin
CREATE POLICY "View attendees by institution or admin"
ON public.attendees FOR SELECT TO authenticated
USING (
  (event_id IN (
    SELECT e.id FROM events e
    WHERE e.institution_uuid IN (
      SELECT p.institution_uuid FROM profiles p WHERE p.id = auth.uid()
    )
  ))
  OR
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ))
);

-- INSERT: institution-scoped or admin
CREATE POLICY "Insert attendees by institution or admin"
ON public.attendees FOR INSERT TO authenticated
WITH CHECK (
  (event_id IN (
    SELECT e.id FROM events e
    WHERE e.institution_uuid IN (
      SELECT p.institution_uuid FROM profiles p WHERE p.id = auth.uid()
    )
  ))
  OR
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ))
);

-- UPDATE: institution-scoped or admin
CREATE POLICY "Update attendees by institution or admin"
ON public.attendees FOR UPDATE TO authenticated
USING (
  (event_id IN (
    SELECT e.id FROM events e
    WHERE e.institution_uuid IN (
      SELECT p.institution_uuid FROM profiles p WHERE p.id = auth.uid()
    )
  ))
  OR
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  ))
);
