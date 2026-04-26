DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.token_transactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.token_purchases; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.api_key_usage; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;
ALTER TABLE public.token_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.token_purchases REPLICA IDENTITY FULL;
ALTER TABLE public.api_key_usage REPLICA IDENTITY FULL;