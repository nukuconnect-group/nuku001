/**
 * Central hub for "messages read" events.
 *
 * Responsibilities:
 *  - Deduplicate rapid duplicate "read" events for the same conversation
 *    (prevents the unread counter from decrementing twice if the user
 *    re-opens the same conversation quickly).
 *  - Broadcast read events across tabs (BroadcastChannel + localStorage
 *    fallback) so the badge stays consistent everywhere.
 *  - Maintain an in-memory ring-buffer log of read events for diagnostics.
 *  - Queue read intents made while offline and replay them when the
 *    connection is restored, so the badge eventually reconciles with the
 *    server.
 *
 * Consumers continue to listen to the existing
 * `window` "nuku:messages-read" CustomEvent. This module simply guarantees
 * that event is dispatched exactly once per logical read, both locally
 * and in other tabs.
 */

const CHANNEL_NAME = "nuku-messages-read";
const STORAGE_KEY = "nuku:messages-read:bus";
const OFFLINE_QUEUE_KEY = "nuku:messages-read:offline-queue";
const LOG_KEY = "nuku:messages-read:log";
const DEDUPE_WINDOW_MS = 1500;
const LOG_MAX = 100;

export interface ReadEventDetail {
  conversationId: string;
  decrement?: number;
  /** Stable id used for cross-tab dedupe */
  eventId?: string;
  /** Origin tab id (helps debugging) */
  origin?: string;
  /** Timestamp ms */
  at?: number;
  /** Marks event as offline-queued replay */
  replay?: boolean;
}

export interface ReadLogEntry extends Required<Pick<ReadEventDetail, "conversationId" | "at">> {
  decrement: number;
  origin: string;
  source: "local" | "broadcast" | "storage" | "replay";
  deduped: boolean;
}

const TAB_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const recentEvents = new Map<string, number>(); // eventId -> ts
const recentByConv = new Map<string, number>(); // conversationId -> ts (dedupe rapid re-opens)

let bc: BroadcastChannel | null = null;
try {
  if (typeof BroadcastChannel !== "undefined") bc = new BroadcastChannel(CHANNEL_NAME);
} catch {
  bc = null;
}

const pruneRecent = () => {
  const now = Date.now();
  for (const [k, t] of recentEvents) if (now - t > DEDUPE_WINDOW_MS * 4) recentEvents.delete(k);
  for (const [k, t] of recentByConv) if (now - t > DEDUPE_WINDOW_MS * 4) recentByConv.delete(k);
};

const appendLog = (entry: ReadLogEntry) => {
  try {
    const raw = sessionStorage.getItem(LOG_KEY);
    const arr: ReadLogEntry[] = raw ? JSON.parse(raw) : [];
    arr.push(entry);
    while (arr.length > LOG_MAX) arr.shift();
    sessionStorage.setItem(LOG_KEY, JSON.stringify(arr));
  } catch {}
};

export const getReadLog = (): ReadLogEntry[] => {
  try {
    const raw = sessionStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const clearReadLog = () => {
  try { sessionStorage.removeItem(LOG_KEY); } catch {}
};

const dispatchLocal = (detail: ReadEventDetail, source: ReadLogEntry["source"], deduped: boolean) => {
  const entry: ReadLogEntry = {
    conversationId: detail.conversationId,
    at: detail.at ?? Date.now(),
    decrement: detail.decrement ?? 0,
    origin: detail.origin ?? TAB_ID,
    source,
    deduped,
  };
  appendLog(entry);
  if (deduped) return;
  try {
    window.dispatchEvent(new CustomEvent("nuku:messages-read", { detail }));
  } catch {}
};

const isDuplicate = (detail: ReadEventDetail): boolean => {
  pruneRecent();
  const now = Date.now();
  if (detail.eventId && recentEvents.has(detail.eventId)) return true;
  // Dedupe rapid re-open of same conversation only when no explicit decrement
  // is provided (a real new batch of unread messages should always go through).
  if ((detail.decrement ?? 0) === 0) {
    const last = recentByConv.get(detail.conversationId);
    if (last && now - last < DEDUPE_WINDOW_MS) return true;
  }
  if (detail.eventId) recentEvents.set(detail.eventId, now);
  recentByConv.set(detail.conversationId, now);
  return false;
};

/** Emit a read event from this tab. Dedupes, logs, broadcasts. */
export const emitMessagesRead = (detail: ReadEventDetail) => {
  const enriched: ReadEventDetail = {
    ...detail,
    at: detail.at ?? Date.now(),
    origin: detail.origin ?? TAB_ID,
    eventId: detail.eventId ?? `${detail.conversationId}:${detail.at ?? Date.now()}:${TAB_ID}`,
  };
  const dup = isDuplicate(enriched);
  dispatchLocal(enriched, "local", dup);
  if (dup) return;

  // Cross-tab broadcast
  try { bc?.postMessage(enriched); } catch {}
  try {
    // Storage event fallback for browsers without BroadcastChannel
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
  } catch {}
};

/** Notify subscribers when the offline queue size changes (UI banners). */
const queueListeners = new Set<(size: number) => void>();
const notifyQueueChange = () => {
  const size = getOfflineReadQueue().length;
  queueListeners.forEach((cb) => { try { cb(size); } catch {} });
};
export const subscribeOfflineQueue = (cb: (size: number) => void) => {
  queueListeners.add(cb);
  cb(getOfflineReadQueue().length);
  return () => { queueListeners.delete(cb); };
};

/** Queue a read intent while offline so it can be replayed later. */
export const queueOfflineRead = (detail: ReadEventDetail) => {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const arr: ReadEventDetail[] = raw ? JSON.parse(raw) : [];
    // Dedupe by eventId in the queue too
    if (detail.eventId && arr.some((d) => d.eventId === detail.eventId)) return;
    arr.push({ ...detail, at: detail.at ?? Date.now() });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(arr));
    notifyQueueChange();
  } catch {}
};

export const getOfflineReadQueue = (): ReadEventDetail[] => {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const clearOfflineReadQueue = () => {
  try { localStorage.removeItem(OFFLINE_QUEUE_KEY); notifyQueueChange(); } catch {}
};

/**
 * Replay queued offline reads. Caller supplies the actual DB sync function
 * (e.g. update is_read in supabase). Each replay also re-dispatches the local
 * event so UI counters stay in sync.
 */
export const replayOfflineReads = async (
  syncFn: (detail: ReadEventDetail) => Promise<void>
) => {
  const queue = getOfflineReadQueue();
  if (queue.length === 0) return;
  clearOfflineReadQueue();
  for (const detail of queue) {
    try {
      await syncFn(detail);
      const enriched = { ...detail, replay: true, origin: TAB_ID };
      dispatchLocal(enriched, "replay", false);
      try { bc?.postMessage(enriched); } catch {}
    } catch {
      // Re-queue on failure
      queueOfflineRead(detail);
    }
  }
};

// Wire cross-tab listeners exactly once
if (typeof window !== "undefined") {
  if (bc) {
    bc.onmessage = (ev) => {
      const detail = ev.data as ReadEventDetail;
      if (!detail?.conversationId) return;
      if (detail.origin === TAB_ID) return;
      if (isDuplicate(detail)) {
        dispatchLocal(detail, "broadcast", true);
        return;
      }
      dispatchLocal(detail, "broadcast", false);
    };
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const detail = JSON.parse(e.newValue) as ReadEventDetail;
      if (!detail?.conversationId) return;
      if (detail.origin === TAB_ID) return;
      if (isDuplicate(detail)) {
        dispatchLocal(detail, "storage", true);
        return;
      }
      dispatchLocal(detail, "storage", false);
    } catch {}
  });
}

export const __TAB_ID__ = TAB_ID;
