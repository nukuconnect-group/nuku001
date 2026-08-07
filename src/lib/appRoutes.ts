// Static, indexable application routes used by the SEO admin tools
// (route validation + autocomplete in /admin/seo-preview).
// Dynamic routes (with :param) are excluded since their SEO is auto-generated.

export const APP_ROUTES: string[] = [
  "/",
  "/a-propos",
  "/admin",
  "/admin/seo-canonical",
  "/admin/seo-preview",
  "/adresse-livraison",
  "/affiliation",
  "/aide",
  "/auth",
  "/blog",
  "/buyer-dashboard",
  "/categories",
  "/contact",
  "/dashboard",
  "/devenir-fournisseur",
  "/driver-dashboard",
  "/faq",
  "/faq-nuku-ai",
  "/favoris",
  "/formations",
  "/jetons",
  "/learner-dashboard",
  "/legal",
  "/marketplace",
  "/mes-commandes",
  "/messages",
  "/moderation",
  "/mon-compte",
  "/notifications",
  "/nuku-ai",
  "/nuku-ai/faq",
  "/panier",
  "/plans",
  "/sourcing",
  "/politique-achat",
  "/politique-remboursement",
  "/premium",
  "/privacy",
  "/producteurs",
  "/factures",
  "/remboursements",
  "/reset-password",
  "/settings",
  "/suivi-livraison",
  "/terms",
  "/tokens",
  "/tracabilite",
  "/unsubscribe",
];

export const isKnownRoute = (route: string): boolean => {
  if (route === "__global__") return true;
  return APP_ROUTES.includes(route);
};

export const suggestRoutes = (input: string, limit = 8): string[] => {
  const q = input.trim().toLowerCase();
  if (!q) return APP_ROUTES.slice(0, limit);
  return APP_ROUTES.filter(r => r.toLowerCase().includes(q)).slice(0, limit);
};
