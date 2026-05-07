/**
 * KKiaPay integration helper.
 * The CDN script (https://cdn.kkiapay.me/k.js) is loaded in index.html
 * and exposes `openKkiapayWidget` + `addKkiapayListener` on window.
 */

const KKIAPAY_PUBLIC_KEY = "a3309e101a8f11eb9fa4fdddae5494b4";

declare global {
  interface Window {
    openKkiapayWidget: (config: Record<string, any>) => void;
    addKkiapayListener: (event: string, cb: (data: any) => void) => void;
    removeKkiapayListener: (event: string, cb: (data: any) => void) => void;
  }
}

export interface KKiapayPaymentConfig {
  amount: number;
  reason?: string;
  name?: string;
  phone?: string;
  email?: string;
  onSuccess?: (data: { transactionId: string }) => void;
  onFailed?: (data: any) => void;
}

export function openKKiaPay({
  amount,
  reason = "Paiement NUKUCONNECT",
  name,
  phone,
  email,
  onSuccess,
  onFailed,
}: KKiapayPaymentConfig) {
  if (typeof window.openKkiapayWidget !== "function") {
    console.error("KKiaPay SDK not loaded");
    onFailed?.({ error: "SDK non chargé" });
    return;
  }

  // Clean up old listeners
  const successHandler = (data: any) => {
    window.removeKkiapayListener?.("success", successHandler);
    window.removeKkiapayListener?.("failed", failedHandler);
    onSuccess?.({ transactionId: data?.transactionId || data?.transaction_id || String(data) });
  };
  const failedHandler = (data: any) => {
    window.removeKkiapayListener?.("success", successHandler);
    window.removeKkiapayListener?.("failed", failedHandler);
    onFailed?.(data);
  };

  window.addKkiapayListener?.("success", successHandler);
  window.addKkiapayListener?.("failed", failedHandler);

  window.openKkiapayWidget({
    amount,
    position: "center",
    callback: "",
    data: reason,
    theme: "#1a6b35",
    key: KKIAPAY_PUBLIC_KEY,
    sandbox: false,
    phone: phone || "",
    name: name || "",
    email: email || "",
  });
}

export { KKIAPAY_PUBLIC_KEY };
