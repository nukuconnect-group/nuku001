import { describe, it, expect, vi, beforeEach } from "vitest";
import * as RTL from "@testing-library/react";
const { renderHook, act, waitFor } = RTL as unknown as {
  renderHook: typeof RTL.renderHook;
  act: typeof RTL.act;
  waitFor: (cb: () => void | Promise<void>, opts?: { timeout?: number; interval?: number }) => Promise<void>;
};

// --- Mock Supabase client BEFORE importing the hook ---
const invokeMock = vi.fn();
const fromMock = vi.fn();
const channelMock = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: (...args: any[]) => fromMock(...args),
    functions: { invoke: (...args: any[]) => invokeMock(...args) },
    channel: () => channelMock,
    removeChannel: vi.fn(),
  },
}));

// --- Mock sonner to capture toast calls ---
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: any[]) => toastErrorMock(...args),
    success: (...args: any[]) => toastSuccessMock(...args),
  },
}));

import { useMessages } from "./useMessages";

// Universal chainable thenable that resolves to { data, error }
const makeChain = (resolved: any = { data: [], error: null }) => {
  const chain: any = {};
  ["select", "insert", "update", "eq", "neq", "in", "or", "order", "limit"].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.single = vi.fn().mockResolvedValue({ data: { id: "msg-1" }, error: null });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.then = (resolve: any) => Promise.resolve(resolved).then(resolve);
  return chain;
};

describe("useMessages — email notification toast", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    fromMock.mockReset();

    fromMock.mockImplementation((table: string) => {
      if (table === "messages") {
        // First call from fetchMessages (.select().eq().order())
        // Subsequent calls from insert and update — return a flexible chain
        return {
          ...buildSelectChain([]),
          ...buildInsertChain("msg-1"),
          ...buildUpdateChain(),
        };
      }
      if (table === "conversations") return buildUpdateChain();
      return buildSelectChain([]);
    });
  });

  it("affiche un toast d'erreur quand l'envoi d'email échoue après un nouveau message taggé produit", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { message: "Edge function unreachable" },
    });

    const { result } = renderHook(() =>
      useMessages("conv-1", "profile-1", "user-1")
    );

    await act(async () => {
      await result.current.sendMessage("Bonjour, je suis intéressé par votre produit @produit-123");
    });

    // Wait for the async invoke chain to resolve
    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        "notify-message-recipient",
        expect.objectContaining({
          body: expect.objectContaining({ conversationId: "conv-1" }),
        })
      );
    });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledTimes(1);
    });

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Notification email non envoyée",
      expect.objectContaining({ description: "Edge function unreachable" })
    );

    await waitFor(() => {
      expect(result.current.lastEmailStatus.state).toBe("error");
    });
  });

  it("affiche un toast de succès et expose lastEmailStatus.ok quand l'envoi réussit", async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });

    const { result } = renderHook(() =>
      useMessages("conv-2", "profile-1", "user-1")
    );

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
    });

    expect(result.current.lastEmailStatus.state).toBe("ok");
    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});
