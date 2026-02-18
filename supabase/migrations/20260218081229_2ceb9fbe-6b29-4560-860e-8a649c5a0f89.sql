-- Allow authenticated users to read their own event memberships
CREATE POLICY "Users can view own memberships"
ON public.event_memberships
FOR SELECT
TO authenticated
USING (user_id = auth.uid());