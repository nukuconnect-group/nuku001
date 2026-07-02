import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * i18n audit — scans a curated list of files and fails if a hardcoded
 * French UI literal (from the FR_WORDS blacklist) shows up. This is what
 * we use in CI to catch a regression as soon as a new untranslated string
 * lands in a page that was previously clean.
 *
 * When migrating a new file, add it to AUDITED_FILES to lock it in.
 */

const AUDITED_FILES = [
  // Already fully i18n-migrated
  "src/components/supplier/SupplierKYCForm.tsx",
  // Frozen pages — no hardcoded FR indicator words allowed anymore
  "src/pages/Marketplace.tsx",
  "src/pages/Categories.tsx",
  "src/pages/BuyerDashboard.tsx",
  "src/pages/Dashboard.tsx",
  "src/pages/AdminDashboard.tsx",
  "src/pages/DriverDashboard.tsx",
  "src/pages/LearnerDashboard.tsx",
  "src/pages/Notifications.tsx",
  // Newly frozen: admin + auxiliary pages
  "src/pages/admin/ErrorLogs.tsx",
  "src/pages/admin/RealtimeDiagnostics.tsx",
  "src/pages/admin/SeoPreview.tsx",
  "src/pages/admin/SeoCanonical.tsx",
  "src/pages/AdminWatermarkErrors.tsx",
  "src/pages/Favorites.tsx",
  "src/pages/Cart.tsx",
  "src/pages/Settings.tsx",
  "src/pages/Tokens.tsx",
  "src/pages/Producers.tsx",
];

// Common French words that indicate a hardcoded user-facing UI string.
// Kept narrow to avoid false positives on domain vocabulary that appears
// inside variable names, doc-strings, or already-translated keys.
const FR_WORDS = [
  "\\bVeuillez\\b",
  "\\bRemplissez\\b",
  "\\bSoumettre\\b",
  "\\bReprendre\\b",
  "\\bRemplacer\\b",
  "\\bCapturer\\b",
  "\\bGalerie\\b",
  "\\bCaméra\\b",
];

const ALLOW_COMMENT = /^\s*(\/\/|\*|\/\*)/;

const scan = (path: string) => {
  const abs = resolve(process.cwd(), path);
  if (!existsSync(abs)) return [];
  const src = readFileSync(abs, "utf8");
  const lines = src.split(/\r?\n/);
  const hits: { line: number; text: string; word: string }[] = [];
  const patterns = FR_WORDS.map((w) => new RegExp(w));
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
