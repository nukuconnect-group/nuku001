/**
 * SOLIMI payment gateway client (shared by solimi-init / solimi-verify / solimi-webhook).
 *
 * Auth: every request is signed with HMAC-SHA256 over `rawBody + timestamp`
 * using the API secret, and carries `x-api-key`, `x-timestamp`, `x-signature`.
 * Docs: https://payintegrationdocs.solimi.co
 */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-solimi-signature, x-solimi-timestamp, x-solimi-event",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

export async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function solimiConfig() {
  const apiKey = Deno.env.get("SOLIMI_API_KEY");
  const apiSecret = Deno.env.get("SOLIMI_API_SECRET");
  const baseUrl = (Deno.env.get("SOLIMI_BASE_URL") || "https://apipay-sandbox.solimi.co").replace(/\/+$/, "");
  if (!apiKey || !apiSecret) throw new Error("Configuration SOLIMI manquante (SOLIMI_API_KEY / SOLIMI_API_SECRET)");
  return { apiKey, apiSecret, baseUrl };
}

export interface SolimiResult<T = any> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

/** Signed SOLIMI call with timeout + retry on network/5xx failures. */
export async function solimiRequest<T = any>(
  path: string,
  init: { method?: "GET" | "POST"; body?: Record<string, unknown>; idempotencyKey?: string } = {},
): Promise<SolimiResult<T>> {
  const { apiKey, apiSecret, baseUrl } = solimiConfig();
  const method = init.method || "GET";
  const rawBody = init.body ? JSON.stringify(init.body) : "";

  const attempts = 3;
  let last: SolimiResult<T> = { ok: false, status: 0, data: {} as T, error: "Aucune tentative" };

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = await hmacHex(apiSecret, rawBody + timestamp);
    const headers: Record<string, string> = {
      Accept: "application/json",
      "x-api-key": apiKey,
      "x-timestamp": timestamp,
      "x-signature": signature,
    };
    if (rawBody) headers["Content-Type"] = "application/json";
    if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: rawBody || undefined,
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => ({}))) as any;
      last = {
        ok: res.ok,
        status: res.status,
        data,
        error: res.ok ? undefined : (data?.message || data?.code || `HTTP ${res.status}`),
      };
      // Do not retry client errors (auth/validation/duplicate/not found).
      if (res.ok || (res.status >= 400 && res.status < 500)) return last;
    } catch (e) {
      last = { ok: false, status: 0, data: {} as T, error: (e as Error).message || "Erreur réseau SOLIMI" };
    } finally {
      clearTimeout(timer);
    }
    if (attempt < attempts) await new Promise((r) => setTimeout(r, attempt * 800));
  }
  return last;
}

/** Map every SOLIMI status / event to our internal payment states. */
export function normalizeStatus(value: unknown): string {
  const s = String(value || "").toLowerCase().replace(/^payment\./, "");
  if (["success", "successful", "succeeded", "completed", "paid"].includes(s)) return "success";
  if (["failed", "declined", "rejected", "error"].includes(s)) return "failed";
  if (["cancelled", "canceled"].includes(s)) return "cancelled";
  if (["expired", "timeout"].includes(s)) return "expired";
  if (["refunded", "reversed"].includes(s)) return "refunded";
  if (["created", "initiated", "payment_initiated", "pending", "pending_approval", "processing"].includes(s)) {
    return "pending";
  }
  return "pending";
}

export const isFinalFailure = (status: string) => ["failed", "cancelled", "expired"].includes(status);
