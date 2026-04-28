/**
 * Lightweight in-memory ring buffer to diagnose realtime latency
 * (presence updates, message arrivals, call signaling).
 *
 * Usage:
 *   import { logDiag, getDiagEvents } from "@/lib/diagnostics";
 *   logDiag("call", "incoming", { from: userId });
 *   getDiagEvents(); // -> last 200 events
 *
 * Listen to live updates:
 *   window.addEventListener("nuku:diag-event", (e) => console.log(e.detail));
 */

export type DiagCategory = "presence" | "call" | "message";

export interface DiagEvent {
  ts: number;
  category: DiagCategory;
  type: string;
  meta?: Record<string, unknown>;
}

const MAX = 200;
const buffer: DiagEvent[] = [];

export function logDiag(category: DiagCategory, type: string, meta?: Record<string, unknown>) {
  const evt: DiagEvent = { ts: Date.now(), category, type, meta };
  buffer.push(evt);
  if (buffer.length > MAX) buffer.shift();
  try {
    window.dispatchEvent(new CustomEvent("nuku:diag-event", { detail: evt }));
  } catch {
    /* SSR-safe no-op */
  }
  // Helpful when investigating real-time delays in the console
  if (typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.debug(`[diag:${category}] ${type}`, meta || "");
  }
}

export function getDiagEvents(filter?: DiagCategory): DiagEvent[] {
  if (!filter) return [...buffer];
  return buffer.filter((e) => e.category === filter);
}

export function clearDiagEvents() {
  buffer.length = 0;
}

// Expose globally for quick browser-console inspection
if (typeof window !== "undefined") {
  (window as unknown as { __nukuDiag?: unknown }).__nukuDiag = { getDiagEvents, clearDiagEvents };
}
