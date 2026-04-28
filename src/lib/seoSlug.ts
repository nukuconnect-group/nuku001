// Slug normalization shared by the admin UI.
// Mirrors the SQL function `public.normalize_seo_slug` so the client can
// validate and surface errors before hitting the database.

export function normalizeSeoSlug(input: string | null | undefined): string {
  if (input == null) return "";
  let v = String(input).trim().toLowerCase();
  if (v === "__global__") return v;
  if (!v.startsWith("/")) v = "/" + v;
  v = v.replace(/[^a-z0-9\-/]/g, "");
  v = v.replace(/\/+/g, "/");
  if (v.length > 1 && v.endsWith("/")) v = v.slice(0, -1);
  return v;
}

export function isValidSlugShape(input: string): boolean {
  const v = normalizeSeoSlug(input);
  return v === "__global__" || /^\/[a-z0-9\-/]*$/.test(v);
}
