
-- Allow admins to view all driver profiles (needed for approval workflow)
CREATE POLICY "Admins can view all driver profiles"
ON public.driver_profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update driver profiles (e.g. approve/reject)
CREATE POLICY "Admins can update driver profiles"
ON public.driver_profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
