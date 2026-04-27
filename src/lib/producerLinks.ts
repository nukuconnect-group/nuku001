/**
 * Build the canonical URL for a supplier's shop page based on the
 * displayed business_name (already resolved by `mapDbToProduct`).
 *
 * The `/producteurs/:name` route accepts the human-readable business
 * name, so this helper just wraps `encodeURIComponent` to keep call
 * sites consistent across the app.
 */
export function producerShopUrl(businessName: string | undefined | null): string {
  const safe = (businessName || "Fournisseur").trim();
  return `/producteurs/${encodeURIComponent(safe)}`;
}
