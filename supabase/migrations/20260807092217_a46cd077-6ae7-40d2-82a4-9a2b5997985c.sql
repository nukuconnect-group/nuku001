ALTER TABLE public.moneroo_transactions RENAME TO solimi_transactions;

ALTER TABLE public.solimi_transactions
  ADD COLUMN IF NOT EXISTS merchant_reference text,
  ADD COLUMN IF NOT EXISTS checkout_reference text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS last_event text,
  ADD COLUMN IF NOT EXISTS error_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

UPDATE public.solimi_transactions SET merchant_reference = payment_id WHERE merchant_reference IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS solimi_transactions_merchant_reference_key ON public.solimi_transactions (merchant_reference);
CREATE INDEX IF NOT EXISTS solimi_transactions_checkout_reference_idx ON public.solimi_transactions (checkout_reference);
CREATE INDEX IF NOT EXISTS solimi_transactions_payment_reference_idx ON public.solimi_transactions (payment_reference);
CREATE INDEX IF NOT EXISTS solimi_transactions_user_id_idx ON public.solimi_transactions (user_id);

GRANT SELECT ON public.solimi_transactions TO authenticated;
GRANT ALL ON public.solimi_transactions TO service_role;