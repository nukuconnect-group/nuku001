CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_movements_credit_once_per_order
ON public.wallet_movements (order_id)
WHERE type = 'credit' AND order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_deliveries_one_per_order
ON public.deliveries (order_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_moneroo_transactions_payment_id_unique
ON public.moneroo_transactions (payment_id);

CREATE INDEX IF NOT EXISTS idx_orders_pending_notes
ON public.orders (status)
WHERE status = 'pending';