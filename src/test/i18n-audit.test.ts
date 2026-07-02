import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * i18n audit: ensures the SupplierKYCForm no longer ships hardcoded French
 * user-facing strings. This is intentionally scoped to files that have been
 * migrated so it can fail loudly if someone re-introduces a raw FR literal.
 *
 * To extend: add files to `AUDITED_FILES` after migrating their strings.
 */

const AUDITED_FILES = [
  "src/components/supplier/SupplierKYCForm.tsx",
];

// Common French words that indicate a hardcoded UI string.
const FR_WORDS = [
  "\\bVeuillez\\b",
  "\\bRemplissez\\b",
  "\\bSoumettre\\b",
  "\\bReprendre\\b",
  "\\bRemplacer\\b",
  "\\bAnnuler\\b",
  "\\bCapturer\\b",
  "\\bImpossible\\b",
  "\\bd'accéder\\b",
  "\\bGalerie\\b",
  "\\bCaméra\\b",
  "\\bpièce\\b",
  "\\bactivité\\b",
  "\\bvérification\\b",
];

const ALLOW_COMMENT = /^\s*(\/\/|\*|\/\*)/;

const scan = (path: string) => {
  const abs = resolve(process.cwd(), path);
  const src = readFileSync(abs, "utf8");
  const lines = src.split(/\r?\n/);
  const hits: { line: number; text: string; word: string }[] = [];
  const patterns = FR_WORDS.map((w) => new RegExp(w, "i"));
  lines.forEach((raw, i) => {
    if (ALLOW_COMMENT.test(raw)) return;
    for (const p of patterns) {
      const m = raw.match(p);
      if (m) hits.push({ line: i + 1, text: raw.trim(), word: m[0] });
    }
  });
  return hits;
};

describe("i18n audit", () => {
  for (const file of AUDITED_FILES) {
    it(`${file} has no hardcoded French UI literals`, () => {
      const hits = scan(file);
      if (hits.length) {
        const preview = hits.slice(0, 8).map((h) => `  L${h.line} [${h.word}] ${h.text}`).join("\n");
        throw new Error(
          `Found ${hits.length} hardcoded French string(s) in ${file}. Migrate them to t("…"):\n${preview}`,
        );
      }
      expect(hits).toEqual([]);
    });
  }
});
