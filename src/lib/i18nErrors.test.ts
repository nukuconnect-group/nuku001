import { describe, it, expect } from "vitest";
import { backendErrorKey, translateBackendError } from "./i18nErrors";

describe("backendErrorKey", () => {
  it("returns unauthorized for 401 / JWT errors", () => {
    expect(backendErrorKey({ status: 401 })).toBe("err.unauthorized");
    expect(backendErrorKey({ message: "JWT expired" })).toBe("err.unauthorized");
    expect(backendErrorKey({ message: "Not authenticated" })).toBe("err.unauthorized");
  });

  it("returns forbidden for 403 / RLS", () => {
    expect(backendErrorKey({ status: 403 })).toBe("err.forbidden");
    expect(backendErrorKey({ code: "42501" })).toBe("err.forbidden");
    expect(backendErrorKey({ message: "permission denied for table x" })).toBe("err.forbidden");
  });

  it("returns duplicate for 23505 / unique violation", () => {
    expect(backendErrorKey({ code: "23505" })).toBe("err.duplicate");
    expect(backendErrorKey({ message: "duplicate key value" })).toBe("err.duplicate");
  });

  it("returns notFound for PGRST116 / 404", () => {
    expect(backendErrorKey({ status: 404 })).toBe("err.notFound");
    expect(backendErrorKey({ code: "PGRST116" })).toBe("err.notFound");
  });

  it("returns rateLimit for 429 and serverError for 5xx", () => {
    expect(backendErrorKey({ status: 429 })).toBe("err.rateLimit");
    expect(backendErrorKey({ status: 503 })).toBe("err.serverError");
  });

  it("returns network for fetch failures", () => {
    expect(backendErrorKey({ message: "Failed to fetch" })).toBe("err.network");
  });

  it("falls back to generic", () => {
    expect(backendErrorKey(null)).toBe("err.generic");
    expect(backendErrorKey({ message: "oops" })).toBe("err.generic");
  });

  it("translateBackendError calls t() with the resolved key", () => {
    const t = (k: string) => `T:${k}`;
    expect(translateBackendError({ status: 429 }, t)).toBe("T:err.rateLimit");
  });
});
