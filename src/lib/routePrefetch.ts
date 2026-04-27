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
  "/": () => import("../pages/Index"),
  "/marketplace": () => import("../pages/Marketplace"),
  "/produit": () => import("../pages/ProductDetail"),
  "/producteurs": () => import("../pages/Producers"),
  "/nuku-ai": () => import("../pages/NukuAI"),
  "/formations": () => import("../pages/Formations"),
  "/tracabilite": () => import("../pages/Traceability"),
  "/messages": () => import("../pages/Messages"),
  "/auth": () => import("../pages/Auth"),
  "/dashboard": () => import("../pages/Dashboard"),
  "/buyer-dashboard": () => import("../pages/BuyerDashboard"),
  "/cart": () => import("../pages/Cart"),
  "/driver-dashboard": () => import("../pages/DriverDashboard"),
  "/learner-dashboard": () => import("../pages/LearnerDashboard"),
  "/plans": () => import("../pages/Plans"),
  "/tokens": () => import("../pages/Tokens"),
  "/notifications": () => import("../pages/Notifications"),
  "/favorites": () => import("../pages/Favorites"),
  "/categories": () => import("../pages/Categories"),
  "/blog": () => import("../pages/Blog"),
  "/admin": () => import("../pages/AdminDashboard"),
  "/settings": () => import("../pages/Settings"),
};

import { getConnectionMode } from "./connectionMode";

const prefetched = new Set<string>();

export type PrefetchTrigger = "hover" | "focus" | "touch" | "idle";

/**
 * Précharge une route donnée. Le comportement dépend du mode connexion :
 * - low  : seul "focus" est autorisé (intention claire au clavier)
 * - mid  : "focus" et "touch" autorisés (pas de hover ni d'idle)
 * - fast : tous les triggers autorisés
 */
export const prefetchRoute = (path: string, trigger: PrefetchTrigger = "hover") => {
  const mode = getConnectionMode();
  if (mode === "low" && trigger !== "focus") return;
  if (mode === "mid" && (trigger === "hover" || trigger === "idle")) return;

  const key = Object.keys(routePrefetchers).find(
    (k) => path === k || path.startsWith(k + "/")
  );
  if (!key || prefetched.has(key)) return;

  prefetched.add(key);
  routePrefetchers[key]().catch(() => prefetched.delete(key));
};

/** Précharge les routes les plus probables après chargement initial. Désactivé hors mode "fast". */
export const prefetchLikelyRoutes = () => {
  if (getConnectionMode() !== "fast") return;
  const idle = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1500));
  idle(() => {
    prefetchRoute("/marketplace", "idle");
    prefetchRoute("/auth", "idle");
  });
  idle(
    () => {
      prefetchRoute("/categories", "idle");
      prefetchRoute("/formations", "idle");
    },
    { timeout: 3000 }
  );
};

/** Attache un listener de préchargement au survol ou focus d'un élément. */
export const attachPrefetchOnHover = (el: HTMLElement, path: string) => {
  const onHover = () => prefetchRoute(path, "hover");
  const onFocus = () => prefetchRoute(path, "focus");
  const onTouch = () => prefetchRoute(path, "touch");
  el.addEventListener("mouseenter", onHover, { once: true });
  el.addEventListener("focus", onFocus, { once: true });
  el.addEventListener("touchstart", onTouch, { once: true, passive: true });
  return () => {
    el.removeEventListener("mouseenter", onHover);
    el.removeEventListener("focus", onFocus);
    el.removeEventListener("touchstart", onTouch);
  };
};
