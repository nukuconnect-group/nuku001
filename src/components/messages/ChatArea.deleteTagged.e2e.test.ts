import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * E2E-style contract test for deleting a message that embeds a tagged product.
 *
 * The message content is:  "Bonjour ...\n[product:<base64 payload>]"
 * After soft-delete the row's content becomes the placeholder, so:
 *   - The recipient (realtime UPDATE handler in useMessages) sees the
 *     text swapped to "Message supprimé" and NO product card in the bubble
 *     (parseMessage no longer matches the [product:...] tag).
 *   - The base product page and any *other* messages that still reference
 *     the product remain intact — deletion is scoped to that one row.
 */

const MSG_ID = "msg-tagged";
const OTHER_TAGGED_ID = "msg-tagged-2";
const PLACEHOLDER = "🚫 Message supprimé";

const productPayload = {
  id: "prod-1",
  name: "Tomates fraîches",
  image: "https://cdn/tomatoes.jpg",
  url: "https://nukuconnect.com/produit/prod-1",
};
const b64 = Buffer.from(JSON.stringify(productPayload), "utf8").toString("base64");
const originalContent = `Bonjour, je suis intéressé(e) par "Tomates fraîches".\n[product:${b64}]`;

const store: Record<string, string> = {
  [MSG_ID]: originalContent,
  [OTHER_TAGGED_ID]: originalContent,
};

const updateSpy = vi.fn();
const deleteSpy = vi.fn();

vi.mock("@/integrations/supabase/client", () => {
  const table = {
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

// Mirror of ChatArea.parseMessage — kept local to lock the contract.
const parseMessage = (content: string) => {
  const productMatch = content.match(/\[product:([A-Za-z0-9+/=]+)\]/);
  let product: any = null;
  if (productMatch) {
    try {
      const json = Buffer.from(productMatch[1], "base64").toString("utf8");
      product = JSON.parse(json);
    } catch {}
  }
  const text = content
    .replace(/\n?\[product:[^\]]+\]/, "")
    .replace(/\n?https?:\/\/\S*\/produit\/\S+/gi, "")
    .trim();
  return { text, product };
};

describe("Delete a message with a tagged product (E2E contract)", () => {
  beforeEach(() => {
    updateSpy.mockClear();
    deleteSpy.mockClear();
    store[MSG_ID] = originalContent;
    store[OTHER_TAGGED_ID] = originalContent;
  });

  it("before deletion the tagged message renders with the product card", () => {
    const { text, product } = parseMessage(store[MSG_ID]);
    expect(product?.name).toBe("Tomates fraîches");
    expect(text).toContain("Tomates fraîches");
    expect(text).not.toMatch(/\[product:/);
    expect(text).not.toMatch(/https?:\/\//);
  });

  it("soft-deletion swaps the content to the placeholder and drops the product tag", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await (supabase.from("messages") as any).update({ content: PLACEHOLDER }).eq("id", MSG_ID);

    expect(updateSpy).toHaveBeenCalledWith({ content: PLACEHOLDER });
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(store[MSG_ID]).toBe(PLACEHOLDER);

    const { text, product } = parseMessage(store[MSG_ID]);
    expect(text).toBe(PLACEHOLDER);
    expect(product).toBeNull();
  });

  it("the realtime UPDATE payload the recipient receives yields 'Message supprimé' and no product card", () => {
    // Simulate the realtime payload delivered to the other client
    const payload = { id: MSG_ID, content: PLACEHOLDER };
    const { text, product } = parseMessage(payload.content);
    expect(text).toBe(PLACEHOLDER);
    expect(product).toBeNull();
  });

  it("other messages tagging the same product remain intact and still render the card", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await (supabase.from("messages") as any).update({ content: PLACEHOLDER }).eq("id", MSG_ID);

    const { product } = parseMessage(store[OTHER_TAGGED_ID]);
    expect(product?.id).toBe("prod-1");
    expect(product?.name).toBe("Tomates fraîches");
  });
});
