-- Add proper INSERT policy for attendees (admins and institution-scoped organizers)
CREATE POLICY "Insert attendees by institution or admin"
ON public.attendees
FOR INSERT
TO authenticated
WITH CHECK (
  (
    event_id IN (
      SELECT e.id FROM events e
      WHERE e.institution_uuid IN (
        SELECT p.institution_uuid FROM profiles p WHERE p.id = auth.uid()
      )
    )
  )
  OR
  (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
    )
  )
);