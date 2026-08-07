/**
 * SOLIMI integration helper.
 * Calls the solimi-init Edge Function, then redirects to the SOLIMI hosted
 * checkout. On completion the user is sent back to /payment-callback.
 */

import { invokeAuthenticatedFunction } from "@/lib/edgeFunctions";

const PENDING_PAYMENT_KEY = "nuku:pendingPayment";

export interface SolimiPaymentConfig {
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
 * Save payment context, create the SOLIMI checkout session,
 * and redirect the user to the SOLIMI payment page.
 */
export async function openSolimiPay(config: SolimiPaymentConfig) {
  const {
    amount,
    description = "Paiement NUKUCONNECT",
    currency = "XOF",
    customer,
    context,
    contextData = {},
    onError,
  } = config;

  // Build return URL pointing to our callback page. Use the CURRENT origin
  // whenever it is a real http(s) host; fall back to production for native
  // shells (capacitor://, file://) which SOLIMI cannot redirect to.
  const PROD_URL = "https://nukuconnect.com/payment-callback";
  let returnUrl = PROD_URL;
  try {
    const proto = window.location.protocol;
    const host = window.location.hostname;
    const isHttp = proto === "https:" || proto === "http:";
    const isRoutableHost =
      isHttp &&
      !!host &&
      host !== "localhost" &&
      host !== "127.0.0.1" &&
      !host.startsWith("192.168.") &&
      !host.startsWith("10.");
    if (isRoutableHost) {
      returnUrl = `${window.location.origin}/payment-callback`;
    }
  } catch {
    returnUrl = PROD_URL;
  }

  try {
    const data = await invokeAuthenticatedFunction<{
      checkout_url?: string;
      payment_id?: string;
      error?: string;
    }>("solimi-init", {
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

    window.location.href = data.checkout_url;
    return true;
  } catch (err: any) {
    onError?.(err.message || "Erreur réseau");
    return false;
  }
}

/** Read the pending payment context. */
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

/** Clear the pending payment context. */
export function clearPendingPayment() {
  try {
    sessionStorage.removeItem(PENDING_PAYMENT_KEY);
    localStorage.removeItem(PENDING_PAYMENT_KEY);
  } catch {
    // noop
  }
}
