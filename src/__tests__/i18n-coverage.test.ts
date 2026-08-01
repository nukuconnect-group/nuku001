import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * i18n coverage — checklist automatisée.
 *
 * 1. Toute clé `t("…")` utilisée dans src/ DOIT exister en français (langue pivot).
 * 2. L'anglais DOIT couvrir 100 % des clés utilisées (aucune retombée FR visible).
 * 3. Les langues locales (ewe, kab, wo) DOIVENT couvrir 100 % du socle critique
 *    (navigation, commun, hero, auth, footer, marketplace, panier) et rester
 *    au-dessus d'un plancher global de couverture — anti-régression.
 */

const LOCALES = ["fr", "en", "ewe", "kab", "wo"] as const;
type Locale = (typeof LOCALES)[number];

const CORE_PREFIXES = ["nav.", "common.", "hero.", "auth.", "footer.", "mp.", "cart."];
const LOCAL_LANGS: Locale[] = ["ewe", "kab", "wo"];
const LOCAL_MIN_COVERAGE = 0.5; // plancher anti-régression sur les clés réellement utilisées

const DICT_FILES = ["src/contexts/LanguageContext.tsx", "src/lib/i18nExtra.ts"];

const readDicts = (): Record<Locale, Set<string>> => {
  const out = Object.fromEntries(LOCALES.map((l) => [l, new Set<string>()])) as Record<Locale, Set<string>>;
  for (const file of DICT_FILES) {
    const src = readFileSync(resolve(process.cwd(), file), "utf8");
    const header = /^ {2}(fr|en|ewe|kab|wo): \{$/gm;
    let m: RegExpExecArray | null;
    while ((m = header.exec(src))) {
      const start = m.index + m[0].length;
      const end = src.indexOf("\n  },", start);
      const body = src.slice(start, end === -1 ? undefined : end);
      for (const k of body.matchAll(/"([^"\\]+)":/g)) out[m[1] as Locale].add(k[1]);
    }
  }
  return out;
};

const walk = (dir: string, acc: string[] = []): string[] => {
  const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
  for (const entry of readdirSync(dir)) {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.tsx?$/.test(entry)) acc.push(full);
  }
  return acc;
};

const usedKeys = (): Set<string> => {
  const keys = new Set<string>();
  for (const file of walk(resolve(process.cwd(), "src"))) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/\bt\(\s*"([a-zA-Z][\w.]*)"/g)) keys.add(m[1]);
  }
  return keys;
};

const dicts = readDicts();
const used = usedKeys();

describe("i18n coverage", () => {
  it("collecte des clés non vide", () => {
    expect(used.size).toBeGreaterThan(100);
    expect(dicts.fr.size).toBeGreaterThan(100);
  });

  it("toutes les clés utilisées existent en français (pivot)", () => {
    const missing = [...used].filter((k) => !dicts.fr.has(k)).sort();
    expect(missing, `Clés absentes du dictionnaire FR :\n${missing.join("\n")}`).toEqual([]);
  });

  it("l'anglais couvre 100 % des clés utilisées", () => {
    const missing = [...used].filter((k) => !dicts.en.has(k)).sort();
    expect(missing, `Clés absentes du dictionnaire EN :\n${missing.join("\n")}`).toEqual([]);
  });

  for (const lang of LOCAL_LANGS) {
    it(`${lang} couvre 100 % du socle critique`, () => {
      const core = [...used].filter((k) => CORE_PREFIXES.some((p) => k.startsWith(p)));
      const missing = core.filter((k) => !dicts[lang].has(k)).sort();
      expect(missing, `Socle critique manquant en ${lang} :\n${missing.join("\n")}`).toEqual([]);
    });

    it(`${lang} reste au-dessus du plancher de couverture`, () => {
      const covered = [...used].filter((k) => dicts[lang].has(k)).length;
      const ratio = covered / used.size;
      expect(
        ratio,
        `Couverture ${lang} = ${(ratio * 100).toFixed(1)} % (< ${LOCAL_MIN_COVERAGE * 100} %)`,
      ).toBeGreaterThanOrEqual(LOCAL_MIN_COVERAGE);
    });
  }

  it("aucune langue ne déclare de clé orpheline vis-à-vis du FR", () => {
    const orphans: string[] = [];
    for (const lang of LOCALES) {
      if (lang === "fr") continue;
      for (const k of dicts[lang]) if (!dicts.fr.has(k)) orphans.push(`${lang}:${k}`);
    }
    expect(orphans, `Clés sans équivalent FR :\n${orphans.join("\n")}`).toEqual([]);
  });
});
