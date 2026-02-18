-- Update ticket_tiers policies to include event_organizer role
DROP POLICY IF EXISTS "Admins manage ticket tiers" ON public.ticket_tiers;
CREATE POLICY "Admins manage ticket tiers"
ON public.ticket_tiers
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = ANY (ARRAY['super_admin', 'admin', 'organizer_admin', 'event_organizer'])
));

DROP POLICY IF EXISTS "Admins manage tickets" ON public.ticket_tiers;
CREATE POLICY "Admins manage tickets"
ON public.ticket_tiers
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = ANY (ARRAY['super_admin', 'admin', 'organizer_admin', 'event_organizer'])
));