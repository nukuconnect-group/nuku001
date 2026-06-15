/**
 * Moneroo integration helper.
 * Calls the moneroo-init Edge Function, then redirects to Moneroo checkout.
 * On payment completion, user is redirected back to /payment-callback.
 */

import { invokeAuthenticatedFunction } from "@/lib/edgeFunctions";

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

  // Build return URL pointing to our callback page.
  // On mobile (Capacitor) or preview/sandbox hosts, force the production domain
  // so the Moneroo redirect lands on a real, routable page (otherwise the
  // browser opens capacitor://localhost or a stale sandbox URL → 404).
  const PROD_URL = "https://nukuconnect.com/payment-callback";
  let returnUrl = PROD_URL;
  try {
    const host = window.location.hostname;
    const isProd =
      host === "nukuconnect.com" ||
      host === "www.nukuconnect.com" ||
      host.endsWith(".nukuconnect.com");
    if (isProd) {
      returnUrl = `${window.location.origin}/payment-callback`;
    }
  } catch {
    returnUrl = PROD_URL;
  }

  try {
    const data = await invokeAuthenticatedFunction<{ checkout_url?: string; payment_id?: string; error?: string }>("moneroo-init", {
      amount,
      currency,
      description,
      return_url: returnUrl,
      customer: customer || {},
      metadata: { context, ...contextData },
    });

    if (!data?.checkout_url) {
      const msg = data?.error || "Impossible d'ouvrir le paiement";
      onError?.(msg);
      return false;
    }

    // Save context so we can resume after redirect or browser refresh
    const pendingPayload = JSON.stringify({
      context,
      contextData,
      amount,
      paymentId: data.payment_id,
      checkoutUrl: data.checkout_url,
      ts: Date.now(),
    });
    try { sessionStorage.setItem(PENDING_PAYMENT_KEY, pendingPayload); } catch {}
    try { localStorage.setItem(PENDING_PAYMENT_KEY, pendingPayload); } catch {}

    // Redirect to Moneroo checkout
    window.location.href = data.checkout_url;
    return true;
  } catch (err: any) {
    onError?.(err.message || "Erreur réseau");
    return false;
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
  checkoutUrl?: string;
  ts: number;
} | null {
  try {
    const raw = sessionStorage.getItem(PENDING_PAYMENT_KEY) || localStorage.getItem(PENDING_PAYMENT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Expire after 30 minutes
    if (Date.now() - data.ts > 30 * 60 * 1000) {
      sessionStorage.removeItem(PENDING_PAYMENT_KEY);
      localStorage.removeItem(PENDING_PAYMENT_KEY);
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
    localStorage.removeItem(PENDING_PAYMENT_KEY);
  } catch {
    // noop
  }
}
