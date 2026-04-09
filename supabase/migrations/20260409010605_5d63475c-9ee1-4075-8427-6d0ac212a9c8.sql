
-- Create supplier KYC submissions table
CREATE TABLE public.supplier_kyc_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  id_type TEXT NOT NULL DEFAULT 'cni',
  id_number TEXT,
  id_front_url TEXT,
  id_back_url TEXT,
  selfie_url TEXT,
  business_name TEXT,
  business_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplier_kyc_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can submit supplier kyc"
ON public.supplier_kyc_submissions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own supplier kyc"
ON public.supplier_kyc_submissions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all supplier kyc"
ON public.supplier_kyc_submissions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update supplier kyc"
ON public.supplier_kyc_submissions FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_supplier_kyc_updated_at
BEFORE UPDATE ON public.supplier_kyc_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
