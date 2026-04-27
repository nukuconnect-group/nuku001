/**
 * Préchargement intelligent des routes.
 *
 * Stratégie :
 * - Map des routes -> imports dynamiques (mêmes que App.tsx pour profiter du cache Vite)
 * - prefetchRoute() déclenche l'import du chunk en arrière-plan
 * - Hook usePrefetchOnHover() s'attache à un <Link> pour précharger au survol/focus
 * - Préchargement automatique des routes "probables" après l'idle (Index → Marketplace, Auth)
 */

const routePrefetchers: Record<string, () => Promise<unknown>> = {
  "/": () => import("./pages/Index"),
  "/marketplace": () => import("./pages/Marketplace"),
  "/produit": () => import("./pages/ProductDetail"),
  "/producteurs": () => import("./pages/Producers"),
  "/nuku-ai": () => import("./pages/NukuAI"),
  "/formations": () => import("./pages/Formations"),
  "/tracabilite": () => import("./pages/Traceability"),
  "/messages": () => import("./pages/Messages"),
  "/auth": () => import("./pages/Auth"),
  "/dashboard": () => import("./pages/Dashboard"),
  "/buyer-dashboard": () => import("./pages/BuyerDashboard"),
  "/cart": () => import("./pages/Cart"),
  "/driver-dashboard": () => import("./pages/DriverDashboard"),
  "/learner-dashboard": () => import("./pages/LearnerDashboard"),
  "/plans": () => import("./pages/Plans"),
  "/tokens": () => import("./pages/Tokens"),
  "/notifications": () => import("./pages/Notifications"),
  "/favorites": () => import("./pages/Favorites"),
  "/categories": () => import("./pages/Categories"),
  "/blog": () => import("./pages/Blog"),
  "/admin": () => import("./pages/AdminDashboard"),
  "/settings": () => import("./pages/Settings"),
};

const prefetched = new Set<string>();

/** Précharge une route donnée si pas déjà fait. No-op sur connexion lente / data saver. */
export const prefetchRoute = (path: string) => {
  // Skip si data saver activé
  const conn = (navigator as any).connection;
  if (conn?.saveData || conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g") {
    return;
  }

  // Match exact ou par préfixe
  const key = Object.keys(routePrefetchers).find(
    (k) => path === k || path.startsWith(k + "/")
  );
  if (!key || prefetched.has(key)) return;

  prefetched.add(key);
  routePrefetchers[key]().catch(() => prefetched.delete(key));
};

/** Précharge les routes les plus probables après chargement initial. */
export const prefetchLikelyRoutes = () => {
  const idle = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1500));
  idle(() => {
    prefetchRoute("/marketplace");
    prefetchRoute("/auth");
  });
  idle(
    () => {
      prefetchRoute("/categories");
      prefetchRoute("/formations");
    },
    { timeout: 3000 }
  );
};

/** Attache un listener de préchargement au survol ou focus d'un élément. */
export const attachPrefetchOnHover = (el: HTMLElement, path: string) => {
  const handler = () => prefetchRoute(path);
  el.addEventListener("mouseenter", handler, { once: true });
  el.addEventListener("focus", handler, { once: true });
  el.addEventListener("touchstart", handler, { once: true, passive: true });
  return () => {
    el.removeEventListener("mouseenter", handler);
    el.removeEventListener("focus", handler);
    el.removeEventListener("touchstart", handler);
  };
};
