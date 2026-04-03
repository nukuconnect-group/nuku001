-- Allow admins to update any order
CREATE POLICY "Admins can update any order"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all deliveries
CREATE POLICY "Admins can view all deliveries"
ON public.deliveries
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update any delivery
CREATE POLICY "Admins can update any delivery"
ON public.deliveries
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all demands
CREATE POLICY "Admins can view all demands"
ON public.demands
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));