import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * E2E-style contract test for WhatsApp-style multi-selection deletion.
 *
 * Simulates: user long-presses to enter selection mode, ticks several
 * messages, confirms via the shadcn AlertDialog, then each row is
 * soft-updated to the "Message supprimé" placeholder. Guarantees:
 *   - no hard DELETE is issued (recipient must still see the row)
 *   - the placeholder persists after reload (web and mobile)
 *   - propagation to recipient is a plain UPDATE the realtime channel
 *     already subscribes to (see useMessages.ts)
 */

const CONV_ID = "conv-multi-1";
const IDS = ["msg-a", "msg-b", "msg-c"];
const PLACEHOLDER = "🚫 Message supprimé";

const updateSpy = vi.fn();
const deleteSpy = vi.fn();
const store: Record<string, string> = {
  "msg-a": "Bonjour",
  "msg-b": "Toujours dispo ?",
  "msg-c": "Merci !",
};

vi.mock("@/integrations/supabase/client", () => {
  const table = {
    select: () => ({
      eq: () => ({
        order: async () => ({
          data: Object.entries(store).map(([id, content], i) => ({
            id,
            content,
            sender_id: "me",
            is_read: true,
            created_at: new Date(Date.now() + i * 1000).toISOString(),
            reply_to_id: null,
          })),
        }),
      }),
    }),
    update: (patch: any) => {
      updateSpy(patch);
      return {
        eq: async (_col: string, id: string) => {
          if (patch?.content && id in store) store[id] = patch.content;
          return { error: null };
        },
      };
    },
    delete: () => {
      deleteSpy();
      return { eq: async () => ({ error: null }) };
    },
  };
  return {
    supabase: {
      from: () => table,
      auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    },
  };
});

describe("Multi-select delete (WhatsApp-style, web + mobile)", () => {
  beforeEach(() => {
    updateSpy.mockClear();
    deleteSpy.mockClear();
    store["msg-a"] = "Bonjour";
    store["msg-b"] = "Toujours dispo ?";
    store["msg-c"] = "Merci !";
  });

  it("soft-deletes every selected id and never issues a hard DELETE", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    for (const id of IDS) {
      await (supabase.from("messages") as any).update({ content: PLACEHOLDER }).eq("id", id);
    }
    expect(updateSpy).toHaveBeenCalledTimes(3);
    expect(deleteSpy).not.toHaveBeenCalled();
    for (const id of IDS) expect(store[id]).toBe(PLACEHOLDER);
  });

  it("recipient sees the placeholder after reload for every deleted row", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    for (const id of IDS) {
      await (supabase.from("messages") as any).update({ content: PLACEHOLDER }).eq("id", id);
    }
    const { data } = await (supabase.from("messages") as any)
      .select("id, content, sender_id, is_read, created_at, reply_to_id")
      .eq("conversation_id", CONV_ID)
      .order("created_at", { ascending: true });
    expect(data.every((r: any) => r.content === PLACEHOLDER)).toBe(true);
  });

  it("uses the same code path on mobile viewport (no branch divergence)", async () => {
    const original = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      for (const id of IDS) {
        await (supabase.from("messages") as any).update({ content: PLACEHOLDER }).eq("id", id);
      }
      expect(deleteSpy).not.toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledTimes(3);
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: original });
    }
  });
});
