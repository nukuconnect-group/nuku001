import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Contract test for the "Discuter" button on the product page.
 * Guarantees that clicking Discuter opens the messaging module with a
 * prefilled draft but NEVER writes a message row on the user's behalf.
 *
 * We assert this at the source level: `handleOpenChat` must not call
 * `.from("messages")` or `.insert(` on the messages table. The full user
 * journey (open → edit → send) is covered by src/components/messages/
 * ChatArea.prefill.test.tsx (input hydration) and manual QA.
 */

const src = readFileSync(
  resolve(process.cwd(), "src/pages/ProductDetail.tsx"),
  "utf8",
);

const extractFn = (name: string): string => {
  const start = src.indexOf(`const ${name} = `);
  if (start === -1) throw new Error(`${name} not found`);
  // Walk braces until balanced.
  let depth = 0;
  let i = src.indexOf("{", start);
  const bodyStart = i;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(bodyStart, i + 1);
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
};

describe('Discuter (Contact seller) button — no auto-send contract', () => {
  const body = extractFn("handleOpenChat");

  it("never inserts into the messages table", () => {
    expect(body).not.toMatch(/from\(\s*["']messages["']\s*\)/);
    // The only insert allowed is on conversations (to open the thread).
    const inserts = body.match(/\.insert\(/g) || [];
    // Zero or one insert (conversation creation) — but never on messages.
    expect(inserts.length).toBeLessThanOrEqual(1);
  });

  it("persists a prefill draft (localStorage) keyed by conversation and seller id", () => {
    // saveDraft() writes to localStorage under msg-draft-<conversationId>
    // and msg-draft-user-<sellerId> so the draft survives reload / navigation.
    expect(body).toMatch(/saveDraft\(\s*\{\s*conversationId,\s*userId:\s*sellerId\s*\}/);
    // Legacy sessionStorage fallback is still written for BC.
    expect(body).toMatch(/sessionStorage\.setItem\(`msg-prefill-\$\{conversationId\}`/);
    expect(body).toMatch(/sessionStorage\.setItem\(`msg-prefill-\$\{sellerId\}`/);
  });

  it("navigates to the messaging page with the conversation id", () => {
    expect(body).toMatch(/navigate\(`\/messages\?conversation=\$\{conversationId\}`\)/);
  });

  it("does not call handleSendAndRedirect (legacy auto-send path)", () => {
    expect(body).not.toMatch(/handleSendAndRedirect/);
  });
});
