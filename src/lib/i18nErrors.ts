/**
 * Backend error → i18n key translator.
 * Maps Supabase/PostgREST error shapes and common HTTP status codes to
 * a translation key from LanguageContext ("err.*"). The caller passes
 * the resolved string through the current `t()` for display.
 */
export type I18nErrorKey =
  | "err.generic"
  | "err.network"
  | "err.unauthorized"
  | "err.forbidden"
  | "err.notFound"
  | "err.duplicate"
  | "err.rateLimit"
  | "err.serverError";

export const backendErrorKey = (err: unknown): I18nErrorKey => {
  if (!err) return "err.generic";
  const anyErr = err as any;
  const status: number | undefined =
    anyErr.status ?? anyErr.statusCode ?? anyErr.response?.status;
  const code: string | undefined = anyErr.code || anyErr.error_code;
  const message: string = String(anyErr.message || anyErr.error || "").toLowerCase();

  if (message.includes("failed to fetch") || message.includes("networkerror")) {
    return "err.network";
  }
  if (code === "23505" || message.includes("duplicate") || message.includes("already exists")) {
    return "err.duplicate";
  }
  if (status === 401 || message.includes("jwt") || message.includes("not authenticated")) {
    return "err.unauthorized";
  }
  if (status === 403 || code === "42501" || message.includes("permission") || message.includes("rls")) {
    return "err.forbidden";
  }
  if (status === 404 || code === "PGRST116") return "err.notFound";
  if (status === 429) return "err.rateLimit";
  if (typeof status === "number" && status >= 500) return "err.serverError";
  return "err.generic";
};

/** Convenience: translate directly using a `t` function. */
export const translateBackendError = (
  err: unknown,
  t: (key: string) => string,
): string => t(backendErrorKey(err));
