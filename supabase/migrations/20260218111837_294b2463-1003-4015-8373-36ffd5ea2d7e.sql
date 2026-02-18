-- The core issue: ALL existing events SELECT policies are RESTRICTIVE,
-- meaning zero rows can ever be returned (Postgres requires at least one PERMISSIVE policy).
-- We'll add a proper PERMISSIVE select policy and clean up conflicting restrictive ones.

-- Drop the overly broad restrictive policies that conflict
DROP POLICY IF EXISTS "Allow reading events" ON public.events;
DROP POLICY IF EXISTS "Public access for dev" ON public.events;
DROP POLICY IF EXISTS "View events logic" ON public.events;
DROP POLICY IF EXISTS "Firme vide samo svoje evente" ON public.events;
DROP POLICY IF EXISTS "Super admin update all events" ON public.events;

-- PERMISSIVE SELECT: users can see events via institution OR membership OR super_admin
CREATE POLICY "Users can view accessible events"
ON public.events
FOR SELECT
TO authenticated
USING (
  -- Super admins see all
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
  OR
  -- Users see events from their institution
  (
    institution_uuid IS NOT NULL
    AND institution_uuid IN (
      SELECT profiles.institution_uuid FROM profiles WHERE profiles.id = auth.uid()
    )
  )
  OR
  -- Users see events they have memberships for
  id IN (
    SELECT event_memberships.event_id FROM event_memberships WHERE event_memberships.user_id = auth.uid()
  )
);

-- PERMISSIVE ALL for super_admin (manage)
CREATE POLICY "Super admins manage all events"
ON public.events
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- PERMISSIVE UPDATE/INSERT/DELETE for institution members
CREATE POLICY "Institution members manage their events"
ON public.events
FOR ALL
TO authenticated
USING (
  institution_uuid IS NOT NULL
  AND institution_uuid IN (
    SELECT profiles.institution_uuid FROM profiles WHERE profiles.id = auth.uid()
  )
);