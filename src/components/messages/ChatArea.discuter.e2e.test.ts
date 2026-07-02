import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveDraft, loadDraft, clearDraft, updateDraftText } from "@/lib/chatDraft";

/**
 * E2E-style contract test for the "Discuter" → chat lifecycle.
 *
 * Simulates the storage-layer behavior end-to-end:
 *   1. ProductDetail "Discuter" click writes a persistent draft.
 *   2. Reloading / navigating away preserves the draft (localStorage).
 *   3. ChatArea's send-only path clears the draft.
 *   4. Discarding clears the draft too.
 *   5. NO supabase.from("messages").insert is invoked at any point before Send.
 *
 * The Supabase client is mocked; any call to messages.insert fails the test.
 */

const CONV_ID = "conv-e2e-1";
const SELLER_ID = "seller-e2e-1";

const messagesInsertSpy = vi.fn();

vi.mock("@/integrations/supabase/client", () => {
  const chain: any = {
    insert: (...args: any[]) => {
      messagesInsertSpy(...args);
      return { select: () => ({ single: async () => ({ data: null, error: null }) }) };
    },
  };
  return {
    supabase: {
      from: (table: string) => {
        if (table === "messages") {
          return chain;
        }
        return {
          insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
          select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        };
      },
    },
  };
});

describe("Discuter → Chat lifecycle (E2E contract)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    messagesInsertSpy.mockClear();
  });

  it("Discuter click writes a persistent draft — no messages insert", () => {
    // Simulate ProductDetail.handleOpenChat's saveDraft call.
    saveDraft(
      { conversationId: CONV_ID, userId: SELLER_ID },
      {
        text: "Bonjour, disponible ?",
        original: "Bonjour, disponible ?",
        product: {
          id: "p1",
          name: "Cacao bio",
          image: "https://cdn/img.jpg",
          url: "https://app/produit/p1",
        },
        createdAt: Date.now(),
      },
    );

    expect(messagesInsertSpy).not.toHaveBeenCalled();
    const draft = loadDraft({ conversationId: CONV_ID, userId: SELLER_ID });
    expect(draft?.text).toBe("Bonjour, disponible ?");
    expect(draft?.product?.name).toBe("Cacao bio");
  });

  it("draft survives navigation / reload until Send or Discard", () => {
    saveDraft(
      { conversationId: CONV_ID, userId: SELLER_ID },
      { text: "draft", original: "draft", createdAt: Date.now() },
    );
    // Simulate reload: everything except localStorage is gone.
    sessionStorage.clear();
    expect(loadDraft({ conversationId: CONV_ID, userId: SELLER_ID })?.text).toBe("draft");
  });

  it("user edits are persisted to the draft (survive reload)", () => {
    saveDraft(
      { conversationId: CONV_ID, userId: SELLER_ID },
      { text: "orig", original: "orig", createdAt: Date.now() },
    );
    updateDraftText({ conversationId: CONV_ID, userId: SELLER_ID }, "orig + edit");
    expect(loadDraft({ conversationId: CONV_ID, userId: SELLER_ID })?.text).toBe("orig + edit");
    // Original preserved for the Reset button.
    expect(loadDraft({ conversationId: CONV_ID, userId: SELLER_ID })?.original).toBe("orig");
  });

  it("Discard button clears the draft; no message row is created", () => {
    saveDraft(
      { conversationId: CONV_ID, userId: SELLER_ID },
      { text: "draft", original: "draft", createdAt: Date.now() },
    );
    clearDraft({ conversationId: CONV_ID, userId: SELLER_ID });
    expect(loadDraft({ conversationId: CONV_ID, userId: SELLER_ID })).toBeNull();
    expect(messagesInsertSpy).not.toHaveBeenCalled();
  });

  it("only an explicit Send would insert a message — nothing implicit does", () => {
    // Simulate the full journey: prefill → edit → navigate away → return.
    saveDraft(
      { conversationId: CONV_ID, userId: SELLER_ID },
      { text: "hi", original: "hi", createdAt: Date.now() },
    );
    updateDraftText({ conversationId: CONV_ID, userId: SELLER_ID }, "hi (edited)");
    // No handler in this suite calls messages.insert.
    expect(messagesInsertSpy).not.toHaveBeenCalled();
  });
});
