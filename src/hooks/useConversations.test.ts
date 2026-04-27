import { describe, it, expect, vi, beforeEach } from "vitest";
import * as RTL from "@testing-library/react";
const { renderHook, act, waitFor } = RTL as unknown as {
  renderHook: typeof RTL.renderHook;
  act: typeof RTL.act;
  waitFor: (cb: () => void | Promise<void>, opts?: { timeout?: number; interval?: number }) => Promise<void>;
};

// --- Mutable fixture: messages "in DB" used by the mocked client ---
let messagesFixture: Array<{
  id: string;
  conversation_id: string;
  content: string;
  created_at: string;
  sender_id: string;
  is_read: boolean;
}> = [];

const PROFILE_ID = "profile-me";
const OTHER_PROFILE_ID = "profile-other";
const USER_ID = "user-me";
const CONV_ID = "conv-1";

const realtimeHandlers: Array<(payload: any) => void> = [];

const channelMock: any = {
  on: vi.fn(function (this: any, _evt: string, _cfg: any, cb: (p: any) => void) {
    realtimeHandlers.push(cb);
    return this;
  }),
  subscribe: vi.fn(function (this: any) {
    return this;
  }),
};

vi.mock("@/integrations/supabase/client", () => {
  const from = (table: string) => {
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({ data: { id: PROFILE_ID, user_type: "buyer" }, error: null }),
          }),
        }),
      };
    }

    if (table === "conversations") {
      return {
        select: () => ({
          or: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    id: CONV_ID,
                    product_id: null,
                    buyer_id: PROFILE_ID,
                    seller_id: OTHER_PROFILE_ID,
                    updated_at: new Date().toISOString(),
                    products: null,
                    buyer: { id: PROFILE_ID, full_name: "Me", avatar_url: null, user_id: USER_ID },
                    seller: {
                      id: OTHER_PROFILE_ID,
                      full_name: "Other",
                      avatar_url: null,
                      user_id: "user-other",
                    },
                  },
                ],
                error: null,
              }),
          }),
        }),
      };
    }

    if (table === "user_presence") {
      return {
        select: () => ({
          in: () => Promise.resolve({ data: [], error: null }),
        }),
      };
    }

    if (table === "messages") {
      return {
        select: () => ({
          in: () => ({
            order: () => ({
              limit: () =>
                Promise.resolve({
                  data: messagesFixture.map((m) => ({
                    conversation_id: m.conversation_id,
                    content: m.content,
                    created_at: m.created_at,
                    sender_id: m.sender_id,
                    is_read: m.is_read,
                  })),
                  error: null,
                }),
            }),
          }),
        }),
      };
    }

    if (table === "driver_profiles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    }

    if (table === "orders") {
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      };
    }

    // Fallback chainable that resolves to empty
    const empty: any = {};
    ["select", "eq", "in", "order", "neq", "or", "limit", "update"].forEach((m) => {
      empty[m] = () => empty;
    });
    empty.maybeSingle = () => Promise.resolve({ data: null, error: null });
    empty.single = () => Promise.resolve({ data: null, error: null });
    empty.then = (r: any) => Promise.resolve({ data: [], error: null }).then(r);
    return empty;
  };

  return {
    supabase: {
      auth: {
        getSession: () =>
          Promise.resolve({ data: { session: { user: { id: USER_ID } } } }),
      },
      from: (t: string) => from(t),
      channel: () => channelMock,
      removeChannel: vi.fn(),
    },
  };
});

import { useConversations } from "./useConversations";

describe("useConversations — badge non lus (rafraîchissement instantané)", () => {
  beforeEach(() => {
    realtimeHandlers.length = 0;
    // 2 messages non lus reçus de l'autre
    messagesFixture = [
      {
        id: "m1",
        conversation_id: CONV_ID,
        content: "Bonjour",
        created_at: new Date(Date.now() - 60_000).toISOString(),
        sender_id: OTHER_PROFILE_ID,
        is_read: false,
      },
      {
        id: "m2",
        conversation_id: CONV_ID,
        content: "Toujours là ?",
        created_at: new Date().toISOString(),
        sender_id: OTHER_PROFILE_ID,
        is_read: false,
      },
    ];
  });

  it("affiche un badge non-lus, le remet à zéro après lecture, puis le réaffiche après un nouveau message", async () => {
    const { result } = renderHook(() => useConversations());

    // 1) Le badge apparaît avec 2 non lus
    await waitFor(() => {
      expect(result.current.conversations.length).toBe(1);
      expect(result.current.conversations[0].unread).toBe(2);
    });

    // 2) Simule l'ouverture de la conversation : useMessages émet l'event "nuku:messages-read"
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent("nuku:messages-read", {
          detail: { conversationId: CONV_ID, decrement: 2 },
        })
      );
    });

    // Le badge doit instantanément passer à 0 (sans attendre le refetch réseau)
    await waitFor(() => {
      expect(result.current.conversations[0].unread).toBe(0);
    });

    // 3) Un nouveau message arrive → realtime déclenche un refetch.
    // On met à jour la fixture côté "DB" avant que le handler ne refasse une requête.
    messagesFixture = [
      {
        id: "m3",
        conversation_id: CONV_ID,
        content: "Nouveau message !",
        created_at: new Date().toISOString(),
        sender_id: OTHER_PROFILE_ID,
        is_read: false,
      },
    ];

    await act(async () => {
      // Déclenche tous les handlers realtime (debounce de 800ms dans le hook)
      realtimeHandlers.forEach((cb) => cb({ eventType: "INSERT" }));
    });

    // Le badge doit revenir à 1 après le refetch debouncé
    await waitFor(
      () => {
        expect(result.current.conversations[0].unread).toBe(1);
      },
      { timeout: 3000 }
    );
  });
});
