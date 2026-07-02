import { supabase } from "@/integrations/supabase/client";

/**
 * Client-side error logger — writes into public.app_error_logs.
 * RLS allows anon+authenticated INSERT; only admins can read.
 * Best-effort: never throws, never awaits at call sites.
 */
export interface LogAppErrorInput {
  message: string;
  stack?: string;
  page?: string;
  component?: string;
  severity?: "info" | "warning" | "error" | "fatal";
  conversationId?: string | null;
  meta?: Record<string, unknown>;
}

let inFlight = 0;
const MAX_IN_FLIGHT = 5;

export function logAppError(input: LogAppErrorInput): void {
  if (typeof window === "undefined") return;
  if (inFlight >= MAX_IN_FLIGHT) return;
  inFlight++;
  (async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      await supabase.from("app_error_logs").insert({
        user_id: auth?.user?.id ?? null,
        conversation_id: input.conversationId ?? null,
        message: input.message.slice(0, 2000),
        stack: input.stack ? input.stack.slice(0, 8000) : null,
        page: input.page ?? window.location.pathname,
        component: input.component ?? null,
        severity: input.severity ?? "error",
        meta: input.meta ?? null,
        user_agent: navigator.userAgent.slice(0, 500),
      } as never);
    } catch {
      // swallow
    } finally {
      inFlight--;
    }
  })();
}

let installed = false;
export function installGlobalErrorLogger(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (ev) => {
    if (!ev?.message) return;
    logAppError({
      message: ev.message,
      stack: ev.error?.stack,
      component: "window.onerror",
      meta: { filename: ev.filename, lineno: ev.lineno, colno: ev.colno },
    });
  });
  window.addEventListener("unhandledrejection", (ev) => {
    const reason: any = ev.reason;
    const message =
      typeof reason === "string" ? reason : reason?.message ?? "Unhandled rejection";
    logAppError({
      message,
      stack: reason?.stack,
      component: "unhandledrejection",
    });
  });
}
