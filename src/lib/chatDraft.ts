/**
 * Chat prefill draft storage.
 *
 * When the user clicks "Discuter" on a product page we DO NOT send a message.
 * We persist a draft (text + product snapshot) so the messaging screen can:
 *   - rehydrate the input on load
 *   - survive a refresh or navigation
 *   - show a clear "prefilled" banner with reset/discard controls
 *
 * Draft is only removed on explicit Send or Discard.
 */

export interface DraftProductSnapshot {
  id: string;
  name: string;
  image?: string | null;
  url: string;
  price?: number | null;
  unit?: string | null;
  location?: string | null;
}

export interface ChatDraft {
  text: string;
  original: string; // baseline for "Reset" action
  product?: DraftProductSnapshot | null;
  createdAt: number;
}

const KEY_BY_CONV = (id: string) => `msg-draft-${id}`;
const KEY_BY_USER = (id: string) => `msg-draft-user-${id}`;

const safeParse = (raw: string | null): ChatDraft | null => {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (v && typeof v.text === "string") return v as ChatDraft;
  } catch {}
  return null;
};

export const saveDraft = (
  ids: { conversationId?: string | null; userId?: string | null },
  draft: ChatDraft,
): void => {
  try {
    const payload = JSON.stringify(draft);
    if (ids.conversationId) localStorage.setItem(KEY_BY_CONV(ids.conversationId), payload);
    if (ids.userId) localStorage.setItem(KEY_BY_USER(ids.userId), payload);
  } catch {}
};

export const loadDraft = (
  ids: { conversationId?: string | null; userId?: string | null },
): ChatDraft | null => {
  try {
    if (ids.conversationId) {
      const d = safeParse(localStorage.getItem(KEY_BY_CONV(ids.conversationId)));
      if (d) return d;
    }
    if (ids.userId) {
      const d = safeParse(localStorage.getItem(KEY_BY_USER(ids.userId)));
      if (d) return d;
    }
  } catch {}
  return null;
};

export const clearDraft = (
  ids: { conversationId?: string | null; userId?: string | null },
): void => {
  try {
    if (ids.conversationId) localStorage.removeItem(KEY_BY_CONV(ids.conversationId));
    if (ids.userId) localStorage.removeItem(KEY_BY_USER(ids.userId));
  } catch {}
};

export const updateDraftText = (
  ids: { conversationId?: string | null; userId?: string | null },
  text: string,
): void => {
  const existing = loadDraft(ids);
  if (!existing) return;
  saveDraft(ids, { ...existing, text });
};
