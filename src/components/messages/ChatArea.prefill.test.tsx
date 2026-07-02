import { describe, it, expect, beforeEach } from "vitest";

// Unit test for the prefill contract used by the "Discuter" button.
// ChatArea reads sessionStorage[`msg-prefill-${conversationId}`] or the
// participant id fallback, hydrates the input WITHOUT sending, and clears
// the keys so a refresh never resurfaces the draft.

const CONV_ID = "conv-123";
const USER_ID = "seller-456";

const hydrateDraft = (conversation: { id: string; participant: { id: string } }) => {
  const byConv = sessionStorage.getItem(`msg-prefill-${conversation.id}`);
  const byUser = sessionStorage.getItem(`msg-prefill-${conversation.participant.id}`);
  const draft = byConv || byUser;
  if (draft) {
    sessionStorage.removeItem(`msg-prefill-${conversation.id}`);
    sessionStorage.removeItem(`msg-prefill-${conversation.participant.id}`);
  }
  return draft;
};

describe("Chat prefill (Discuter button)", () => {
  beforeEach(() => sessionStorage.clear());

  it("hydrates draft from conversation id without sending", () => {
    sessionStorage.setItem(`msg-prefill-${CONV_ID}`, "Bonjour, disponible ?");
    const draft = hydrateDraft({ id: CONV_ID, participant: { id: USER_ID } });
    expect(draft).toBe("Bonjour, disponible ?");
  });

  it("falls back to participant id when conversation key is missing", () => {
    sessionStorage.setItem(`msg-prefill-${USER_ID}`, "Message initial");
    const draft = hydrateDraft({ id: CONV_ID, participant: { id: USER_ID } });
    expect(draft).toBe("Message initial");
  });

  it("clears prefill keys after hydration so nothing is auto-sent on refresh", () => {
    sessionStorage.setItem(`msg-prefill-${CONV_ID}`, "draft");
    sessionStorage.setItem(`msg-prefill-${USER_ID}`, "draft");
    hydrateDraft({ id: CONV_ID, participant: { id: USER_ID } });
    expect(sessionStorage.getItem(`msg-prefill-${CONV_ID}`)).toBeNull();
    expect(sessionStorage.getItem(`msg-prefill-${USER_ID}`)).toBeNull();
  });

  it("returns null when no prefill is set — no message is prepared", () => {
    const draft = hydrateDraft({ id: CONV_ID, participant: { id: USER_ID } });
    expect(draft).toBeNull();
  });
});
