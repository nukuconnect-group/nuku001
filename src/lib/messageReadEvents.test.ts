import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * "E2E" simulation of the two-tab offline scenario for the unread badge.
 *
 * We can't spin up a real browser here, but we exercise the same pub/sub
 * surface the UI relies on: the `messageReadEvents` module dispatching
 * `window` "nuku:messages-read" events with deterministic eventIds, plus
 * the offline queue. This guarantees the badge counter never decrements
 * twice for the same logical "read" — which is the exact regression we
 * want to prevent.
 */

// Polyfill BroadcastChannel as a no-op in jsdom (we test in-process dedupe;
// real cross-tab is a thin wrapper on top of this same pipeline).
class FakeBC {
  static channels: Record<string, FakeBC[]> = {};
  onmessage: ((ev: MessageEvent) => void) | null = null;
  constructor(public name: string) {
    (FakeBC.channels[name] ||= []).push(this);
  }
  postMessage(data: any) {
    for (const ch of FakeBC.channels[this.name] || []) {
      if (ch === this) continue;
      ch.onmessage?.({ data } as MessageEvent);
    }
  }
  close() {}
}
(globalThis as any).BroadcastChannel = FakeBC;

// Fresh module per test (module-level dedupe state must reset)
const loadModule = async () => {
  vi.resetModules();
  return await import("./messageReadEvents");
};

describe("messageReadEvents — two-tab offline scenario", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    FakeBC.channels = {};
  });

  it("never decrements twice for the same conversation re-opened rapidly", async () => {
    const mod = await loadModule();
    const received: number[] = [];
    const handler = (e: Event) => {
      received.push((e as CustomEvent).detail.decrement ?? 0);
    };
    window.addEventListener("nuku:messages-read", handler);

    // Same deterministic eventId = same "last seen" message
    const eventId = "conv-1:lastSeen:msg-42";
    mod.emitMessagesRead({ conversationId: "conv-1", decrement: 3, eventId });
    // User closes & rapidly re-opens — useMessages would re-emit identical id
    mod.emitMessagesRead({ conversationId: "conv-1", decrement: 3, eventId });
    mod.emitMessagesRead({ conversationId: "conv-1", decrement: 3, eventId });

    window.removeEventListener("nuku:messages-read", handler);
    expect(received).toEqual([3]); // only the first decrement is delivered
  });

  it("queues offline reads and replays them once online without double-counting", async () => {
    const mod = await loadModule();
    const received: number[] = [];
    window.addEventListener("nuku:messages-read", (e) => {
      received.push((e as CustomEvent).detail.decrement ?? 0);
    });

    // Tab A: offline → queue
    mod.queueOfflineRead({ conversationId: "conv-1", decrement: 2, eventId: "conv-1:lastSeen:m9" });
    // Same intent queued again (e.g. user re-opens conversation while still offline)
    mod.queueOfflineRead({ conversationId: "conv-1", decrement: 2, eventId: "conv-1:lastSeen:m9" });

    expect(mod.getOfflineReadQueue()).toHaveLength(1); // dedup in queue

    // Connection back: replay
    const sync = vi.fn().mockResolvedValue(undefined);
    await mod.replayOfflineReads(sync);

    expect(sync).toHaveBeenCalledTimes(1);
    expect(received).toEqual([2]);
    expect(mod.getOfflineReadQueue()).toHaveLength(0);
  });

  it("propagates a read event to a second tab without duplicating the decrement", async () => {
    // Tab A
    const tabA = await loadModule();
    const aReceived: number[] = [];
    window.addEventListener("nuku:messages-read", (e) => {
      aReceived.push((e as CustomEvent).detail.decrement ?? 0);
    });

    // Tab B (independent module instance — separate dedupe state, shared BC)
    vi.resetModules();
    const tabB = await import("./messageReadEvents");
    const bReceived: number[] = [];
    window.addEventListener("nuku:messages-read", (e) => {
      // Only count events that originated from tab A on tab B side.
      // In this jsdom env both tabs share `window` so every dispatch fires
      // both listeners. We assert via the log filtered by source instead.
      bReceived.push((e as CustomEvent).detail.decrement ?? 0);
    });

    tabA.emitMessagesRead({
      conversationId: "conv-x",
      decrement: 4,
      eventId: "conv-x:lastSeen:m100",
    });

    // The same logical event reaching tab B is deduped by eventId
    const logB = tabB.getReadLog();
    const broadcastEntries = logB.filter((e) => e.source === "broadcast");
    // Tab B sees exactly one broadcast for this conversation, and it is NOT deduped
    // (first time it sees this eventId). A second emit with the same id would be.
    expect(broadcastEntries.filter((e) => e.conversationId === "conv-x")).toHaveLength(1);
    expect(broadcastEntries[0].deduped).toBe(false);

    // Re-emit identical id from tab A → tab B must mark it as deduped
    tabA.emitMessagesRead({
      conversationId: "conv-x",
      decrement: 4,
      eventId: "conv-x:lastSeen:m100",
    });
    const logB2 = tabB.getReadLog().filter(
      (e) => e.source === "broadcast" && e.conversationId === "conv-x"
    );
    // No new non-deduped broadcast entry was added
    expect(logB2.filter((e) => !e.deduped)).toHaveLength(1);
  });
});
