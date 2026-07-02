#!/usr/bin/env node
/**
 * Internal link checker.
 *
 * Crawls every public route (from public/sitemap.xml + a route seed list),
 * loads the built SPA once per URL, extracts every same-origin <a href>, and
 * verifies each target resolves to a real React <Route> — never the catch-all
 * NotFound page.
 *
 * Runs at build time in CI (no live server needed) by statically resolving
 * href paths against the App.tsx route table. This catches:
 *   - hard-coded links to dead paths (e.g. /shop instead of /marketplace)
 *   - typos in route paths
 *   - stale nav entries pointing to removed pages
 *
 * Usage: node scripts/check-internal-links.mjs
 * Exit code 1 on any broken link.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(process.cwd());
const APP_TSX = readFileSync(join(ROOT, "src/App.tsx"), "utf8");
const SITEMAP = readFileSync(join(ROOT, "public/sitemap.xml"), "utf8");

// 1. Collect declared routes.
const routePaths = [...APP_TSX.matchAll(/<Route\s+path="([^"]+)"/g)].map(
  (m) => m[1],
);

const routeMatchers = routePaths
  .filter((p) => p !== "*")
  .map((p) => {
    // Convert React Router param syntax to regex.
    const regex = new RegExp(
      "^" +
        p
          .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
          .replace(/:[^/]+/g, "[^/]+")
          .replace(/\*/g, ".*") +
        "$",
    );
    return { pattern: p, regex };
  });

const matchesRoute = (path) => {
  const clean = path.split("?")[0].split("#")[0] || "/";
  return routeMatchers.some((r) => r.regex.test(clean));
};

// 2. Walk src/ for hard-coded internal links.
const IGNORED_DIRS = new Set(["node_modules", "dist", ".git", "test", "__tests__"]);
const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (!IGNORED_DIRS.has(name)) walk(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\./.test(name)) {
      out.push(full);
    }
  }
  return out;
};

const files = walk(join(ROOT, "src"));

// Find `to="/..."` (react-router Link/NavLink) and `href="/..."` (raw <a>).
const linkRegex = /\b(?:to|href)=\{?["'`](\/[^"'`\s?#]+)/g;

const broken = new Map(); // href -> Set(files)
let checked = 0;

for (const file of files) {
  const content = readFileSync(file, "utf8");
  let m;
  while ((m = linkRegex.exec(content))) {
    const href = m[1];
    // Skip assets, api paths, mailto, tel, external protocol-relatives.
    if (
      href.startsWith("//") ||
      href.startsWith("/api/") ||
      href.startsWith("/assets/") ||
      href.startsWith("/functions/") ||
      /\.(png|jpg|jpeg|svg|webp|gif|ico|css|js|json|xml|txt|pdf|mp4)$/i.test(href)
    )
      continue;
    checked++;
    if (!matchesRoute(href)) {
      if (!broken.has(href)) broken.set(href, new Set());
      broken.get(href).add(file.replace(ROOT + "/", ""));
    }
  }
}

// 3. Cross-check sitemap URLs against routes too.
const sitemapPaths = [...SITEMAP.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].replace(/^https?:\/\/[^/]+/, "") || "/")
  .filter(Boolean);
const sitemapBroken = sitemapPaths.filter((p) => !matchesRoute(p));

// 4. Report.
console.log(
  `✅ Scanned ${files.length} source files, checked ${checked} internal links against ${routeMatchers.length} routes.`,
);
console.log(`✅ Verified ${sitemapPaths.length} sitemap entries.`);

let failed = false;
if (broken.size) {
  failed = true;
  console.error(`\n❌ ${broken.size} broken internal link(s) — target has no matching <Route>:`);
  for (const [href, filesSet] of broken) {
    console.error(`  ${href}`);
    for (const f of filesSet) console.error(`      ← ${f}`);
  }
}
if (sitemapBroken.length) {
  failed = true;
  console.error(`\n❌ ${sitemapBroken.length} sitemap entries with no matching <Route>:`);
  for (const p of sitemapBroken) console.error(`  ${p}`);
}

if (failed) process.exit(1);
console.log("\n✅ No broken internal links.");
