-- Attach referral earning triggers (functions exist but triggers were missing)

DROP TRIGGER IF EXISTS trg_referral_earning_on_order ON public.orders;
CREATE TRIGGER trg_referral_earning_on_order
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.create_referral_earning_on_order();

DROP TRIGGER IF EXISTS trg_referral_earning_on_subscription ON public.subscriptions;
CREATE TRIGGER trg_referral_earning_on_subscription
AFTER INSERT OR UPDATE OF status, plan ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.create_referral_earning_on_subscription();