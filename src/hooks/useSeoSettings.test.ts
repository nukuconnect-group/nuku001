import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Mutable mock state for the supabase client
let mockRow: any = null;
const maybeSingle = vi.fn(async () => ({ data: mockRow, error: null }));
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from },
}));

import { useSeoSettings, clearSeoCache } from "./useSeoSettings";

describe("useSeoSettings", () => {
  beforeEach(() => {
    clearSeoCache();
    mockRow = null;
    from.mockClear(); select.mockClear(); eq.mockClear(); maybeSingle.mockClear();
  });

  it("returns published overrides for visitors", async () => {
    mockRow = { title: "Hello", description: "Desc", is_draft: false };
    const { result } = renderHook(() => useSeoSettings("/marketplace"));
    await waitFor(() => expect(result.current?.title).toBe("Hello"));
    expect(result.current?.description).toBe("Desc");
  });

  it("does NOT serve drafts to visitors", async () => {
    mockRow = { title: "Draft only", description: "Hidden", is_draft: true };
    const { result } = renderHook(() => useSeoSettings("/marketplace"));
    // Wait long enough for the effect to settle
    await new Promise(r => setTimeout(r, 30));
    await waitFor(() => expect(maybeSingle).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it("returns null when no row exists", async () => {
    mockRow = null;
    const { result } = renderHook(() => useSeoSettings("/unknown"));
    await waitFor(() => expect(maybeSingle).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});
