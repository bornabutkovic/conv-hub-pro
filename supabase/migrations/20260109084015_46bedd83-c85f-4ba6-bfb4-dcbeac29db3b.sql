-- Allow super_admins to insert institutions
CREATE POLICY "Super admins can insert institutions" 
ON public.institutions 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- Allow super_admins to update institutions
CREATE POLICY "Super admins can update institutions" 
ON public.institutions 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- Allow super_admins to update any profile (for assigning institutions)
CREATE POLICY "Super admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);