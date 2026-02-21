
-- ============================================================
-- FIX: Convert ALL restrictive policies to PERMISSIVE
-- across events, attendees, orders, event_memberships
-- ============================================================

-- ==================== EVENTS ====================
DROP POLICY IF EXISTS "Admins manage all events" ON public.events;
DROP POLICY IF EXISTS "Institution members manage own events" ON public.events;
DROP POLICY IF EXISTS "Members can view their events" ON public.events;

-- SELECT: admin sees all, organizers see own institution, members see via event_memberships
CREATE POLICY "events_select" ON public.events
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user(auth.uid())
    OR (institution_uuid IN (SELECT p.institution_uuid FROM profiles p WHERE p.id = auth.uid()))
    OR (id IN (SELECT em.event_id FROM event_memberships em WHERE em.user_id = auth.uid()))
  );

-- INSERT: admin or own institution
CREATE POLICY "events_insert" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_user(auth.uid())
    OR (institution_uuid IN (SELECT p.institution_uuid FROM profiles p WHERE p.id = auth.uid()))
  );

-- UPDATE: admin or own institution
CREATE POLICY "events_update" ON public.events
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_user(auth.uid())
    OR (institution_uuid IN (SELECT p.institution_uuid FROM profiles p WHERE p.id = auth.uid()))
  );

-- DELETE: admin only
CREATE POLICY "events_delete" ON public.events
  FOR DELETE TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- ==================== ATTENDEES ====================
DROP POLICY IF EXISTS "View attendees by institution or admin" ON public.attendees;
DROP POLICY IF EXISTS "Insert attendees by institution or admin" ON public.attendees;
DROP POLICY IF EXISTS "Update attendees by institution or admin" ON public.attendees;

CREATE POLICY "attendees_select" ON public.attendees
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user(auth.uid())
    OR (event_id IN (
      SELECT e.id FROM events e
      WHERE e.institution_uuid IN (SELECT p.institution_uuid FROM profiles p WHERE p.id = auth.uid())
    ))
  );

CREATE POLICY "attendees_insert" ON public.attendees
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_user(auth.uid())
    OR (event_id IN (
      SELECT e.id FROM events e
      WHERE e.institution_uuid IN (SELECT p.institution_uuid FROM profiles p WHERE p.id = auth.uid())
    ))
  );

CREATE POLICY "attendees_update" ON public.attendees
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_user(auth.uid())
    OR (event_id IN (
      SELECT e.id FROM events e
      WHERE e.institution_uuid IN (SELECT p.institution_uuid FROM profiles p WHERE p.id = auth.uid())
    ))
  );

-- ==================== ORDERS ====================
-- Currently has "Public access for dev" - replace with proper policies
DROP POLICY IF EXISTS "Public access for dev" ON public.orders;

CREATE POLICY "orders_select" ON public.orders
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user(auth.uid())
    OR (event_id IN (
      SELECT e.id FROM events e
      WHERE e.institution_uuid IN (SELECT p.institution_uuid FROM profiles p WHERE p.id = auth.uid())
    ))
  );

CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_user(auth.uid())
    OR (event_id IN (
      SELECT e.id FROM events e
      WHERE e.institution_uuid IN (SELECT p.institution_uuid FROM profiles p WHERE p.id = auth.uid())
    ))
  );

CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_user(auth.uid())
    OR (event_id IN (
      SELECT e.id FROM events e
      WHERE e.institution_uuid IN (SELECT p.institution_uuid FROM profiles p WHERE p.id = auth.uid())
    ))
  );

-- ==================== EVENT_MEMBERSHIPS ====================
DROP POLICY IF EXISTS "Admins manage all memberships" ON public.event_memberships;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.event_memberships;

CREATE POLICY "event_memberships_select" ON public.event_memberships
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user(auth.uid())
    OR (user_id = auth.uid())
    OR (event_id IN (
      SELECT e.id FROM events e
      WHERE e.institution_uuid IN (SELECT p.institution_uuid FROM profiles p WHERE p.id = auth.uid())
    ))
  );

CREATE POLICY "event_memberships_manage" ON public.event_memberships
  FOR ALL TO authenticated
  USING (
    public.is_admin_user(auth.uid())
    OR (event_id IN (
      SELECT e.id FROM events e
      WHERE e.institution_uuid IN (SELECT p.institution_uuid FROM profiles p WHERE p.id = auth.uid())
    ))
  );
