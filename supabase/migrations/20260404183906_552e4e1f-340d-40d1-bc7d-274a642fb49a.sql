CREATE OR REPLACE FUNCTION public.notify_withdrawal_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  requester_name text;
  admin_record RECORD;
BEGIN
  -- Get requester name
  SELECT full_name INTO requester_name FROM public.profiles WHERE id = NEW.profile_id;

  -- On INSERT (new withdrawal request) → notify all admins
  IF TG_OP = 'INSERT' THEN
    FOR admin_record IN
      SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, description)
      VALUES (
        admin_record.user_id,
        'withdrawal',
        '💸 Nouvelle demande de retrait',
        COALESCE(requester_name, 'Un utilisateur') || ' demande un retrait de ' || NEW.amount::text || ' FCFA via ' || 
        CASE NEW.operator WHEN 'flooz' THEN 'Moov Money' WHEN 'tmoney' THEN 'T-Money' ELSE NEW.operator END ||
        ' (' || NEW.phone_number || ')'
      );
    END LOOP;
    RETURN NEW;
  END IF;

  -- On UPDATE (status change) → notify the requester
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, type, title, description)
    VALUES (
      NEW.user_id,
      'withdrawal',
      CASE NEW.status
        WHEN 'completed' THEN '✅ Retrait effectué'
        WHEN 'rejected' THEN '❌ Retrait refusé'
        WHEN 'approved' THEN '👍 Retrait approuvé'
        ELSE '📋 Retrait mis à jour'
      END,
      CASE NEW.status
        WHEN 'completed' THEN 'Votre retrait de ' || NEW.amount::text || ' FCFA a été envoyé sur votre compte ' || 
          CASE NEW.operator WHEN 'flooz' THEN 'Moov Money' WHEN 'tmoney' THEN 'T-Money' ELSE NEW.operator END || '.'
        WHEN 'rejected' THEN 'Votre demande de retrait de ' || NEW.amount::text || ' FCFA a été refusée.' || 
          CASE WHEN NEW.admin_note IS NOT NULL THEN ' Motif: ' || NEW.admin_note ELSE '' END
        ELSE 'Votre retrait de ' || NEW.amount::text || ' FCFA a été mis à jour.'
      END
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger
DROP TRIGGER IF EXISTS on_withdrawal_change ON public.withdrawals;
CREATE TRIGGER on_withdrawal_change
AFTER INSERT OR UPDATE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.notify_withdrawal_change();