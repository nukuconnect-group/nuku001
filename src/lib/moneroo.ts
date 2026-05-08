/**
 * Moneroo integration helper.
 * Calls the moneroo-init Edge Function, then redirects to Moneroo checkout.
 * On payment completion, user is redirected back to /payment-callback.
 */

import { supabase } from "@/integrations/supabase/client";

const PENDING_PAYMENT_KEY = "nuku:pendingPayment";

export interface MonerooPaymentConfig {
  amount: number;
  description?: string;
  currency?: string;
  customer?: {
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
  /** Context to restore after redirect (e.g. "plan", "tokens", "cart", "formation") */
  context: string;
  /** Extra data needed to finalize after payment */
  contextData?: Record<string, any>;
  onError?: (error: string) => void;
}

/**
 * Save payment context in sessionStorage, call edge function,
 * and redirect user to Moneroo checkout page.
 */
export async function openMonerooPay(config: MonerooPaymentConfig) {
  const {
    amount,
    description = "Paiement NUKUCONNECT",
    currency = "XOF",
    customer,
    context,
    contextData = {},
    onError,
  } = config;

  // Build return URL pointing to our callback page
  const baseUrl = window.location.origin;
  const returnUrl = `${baseUrl}/payment-callback`;

  try {
    const { data, error } = await supabase.functions.invoke("moneroo-init", {
      body: {
        amount,
        currency,
        description,
        return_url: returnUrl,
        customer,
        metadata: { context, ...contextData },
      },
    });

    if (error || !data?.checkout_url) {
      const msg = (data as any)?.error || error?.message || "Impossible d'ouvrir le paiement";
      onError?.(msg);
      return;
    }

    // Save context so we can resume after redirect
    try {
      sessionStorage.setItem(
        PENDING_PAYMENT_KEY,
        JSON.stringify({
          context,
          contextData,
          amount,
          paymentId: data.payment_id,
          ts: Date.now(),
        })
      );
    } catch {
      // sessionStorage unavailable — continue anyway
    }

    // Redirect to Moneroo checkout
    window.location.href = data.checkout_url;
  } catch (err: any) {
    onError?.(err.message || "Erreur réseau");
  }
}

/**
 * Read the pending payment context from sessionStorage.
 */
export function getPendingPayment(): {
  context: string;
  contextData: Record<string, any>;
  amount: number;
  paymentId: string;
  ts: number;
} | null {
  try {
    const raw = sessionStorage.getItem(PENDING_PAYMENT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Expire after 30 minutes
    if (Date.now() - data.ts > 30 * 60 * 1000) {
      sessionStorage.removeItem(PENDING_PAYMENT_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Clear the pending payment context.
 */
export function clearPendingPayment() {
  try {
    sessionStorage.removeItem(PENDING_PAYMENT_KEY);
  } catch {
    // noop
  }
}
