
-- ============================================================
-- FIX ALL RLS POLICIES: super_admin → admin OR super_admin
-- Remove hardcoded email checks
-- ============================================================

-- ==================== EVENTS ====================
-- Drop old policies
DROP POLICY IF EXISTS "Super admins manage all events" ON public.events;
DROP POLICY IF EXISTS "Users can view accessible events" ON public.events;
DROP POLICY IF EXISTS "Admins can see all events" ON public.events;
DROP POLICY IF EXISTS "Organizers can see their own events" ON public.events;
DROP POLICY IF EXISTS "Institution members manage their events" ON public.events;

-- Admin: full access to all events
CREATE POLICY "Admins manage all events"
ON public.events FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Institution members: full access to their institution's events
CREATE POLICY "Institution members manage own events"
ON public.events FOR ALL TO authenticated
USING (
  institution_uuid IS NOT NULL
  AND institution_uuid IN (
    SELECT profiles.institution_uuid FROM profiles WHERE profiles.id = auth.uid()
  )
);

-- Event membership holders: read access
CREATE POLICY "Members can view their events"
ON public.events FOR SELECT TO authenticated
USING (
  id IN (
    SELECT event_memberships.event_id FROM event_memberships WHERE event_memberships.user_id = auth.uid()
  )
);

-- ==================== EVENT_MEMBERSHIPS ====================
DROP POLICY IF EXISTS "Super admin manages memberships" ON public.event_memberships;

CREATE POLICY "Admins manage all memberships"
ON public.event_memberships FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- ==================== ATTENDEES ====================
DROP POLICY IF EXISTS "View attendees logic" ON public.attendees;

CREATE POLICY "View attendees by institution or admin"
ON public.attendees FOR SELECT TO authenticated
USING (
  event_id IN (
    SELECT events.id FROM events
    WHERE events.institution_uuid IN (
      SELECT profiles.institution_uuid FROM profiles WHERE profiles.id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- ==================== EVENT_SERVICES ====================
DROP POLICY IF EXISTS "View own event services" ON public.event_services;

CREATE POLICY "Manage event services by institution or admin"
ON public.event_services FOR ALL TO authenticated
USING (
  event_id IN (
    SELECT events.id FROM events
    WHERE events.institution_uuid IN (
      SELECT profiles.institution_uuid FROM profiles WHERE profiles.id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- ==================== INSTITUTIONS ====================
DROP POLICY IF EXISTS "Super admins can insert institutions" ON public.institutions;
DROP POLICY IF EXISTS "Super admins can update institutions" ON public.institutions;
DROP POLICY IF EXISTS "View institutions logic" ON public.institutions;

CREATE POLICY "Admins can insert institutions"
ON public.institutions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can update institutions"
ON public.institutions FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "View own or admin institutions"
ON public.institutions FOR SELECT TO authenticated
USING (
  id IN (
    SELECT profiles.institution_uuid FROM profiles WHERE profiles.id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- ==================== PROFILES ====================
-- Remove hardcoded email check
DROP POLICY IF EXISTS "Super Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);
