
-- Allow admins to insert notifications (for broadcast)
CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
