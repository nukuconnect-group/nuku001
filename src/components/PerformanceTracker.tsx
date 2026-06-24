import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { prefetchLikelyRoutes, prefetchRoute } from "@/lib/routePrefetch";

/**
 * Mesure et journalise la performance de chaque navigation :
 * - load_time_ms : durée entre changement de route et fin du rendu
 * - is_slow : > 3000 ms
 * - Inclut TTFB / FCP / DOM ready à la première mesure
 *
 * Précharge également les routes liées probables après chaque navigation.
 */
export const PerformanceTracker = () => {
  const location = useLocation();
  const startRef = useRef<number>(performance.now());
  const firstLoadLogged = useRef(false);

  useEffect(() => {
    startRef.current = performance.now();

    // Mesure après que le DOM ait fini de peindre
    const measure = () => {
      const loadMs = Math.round(performance.now() - startRef.current);
      const route = normalizeRoute(location.pathname);
      const conn = (navigator as any).connection;

      let ttfb: number | undefined;
      let domReady: number | undefined;
      let fcp: number | undefined;

      if (!firstLoadLogged.current) {
        const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
        if (navEntry) {
          ttfb = Math.round(navEntry.responseStart - navEntry.requestStart);
          domReady = Math.round(navEntry.domContentLoadedEventEnd - navEntry.startTime);
        }
        const fcpEntry = performance.getEntriesByName("first-contentful-paint")[0];
        if (fcpEntry) fcp = Math.round(fcpEntry.startTime);
        firstLoadLogged.current = true;
      }

      const isSlow = loadMs > 3000;
      const shouldPersist = isSlow || Math.random() < 0.1;

      // Logging local console (visible en dev)
      if (isSlow) {
        console.warn(`[Perf] Route lente: ${route} → ${loadMs}ms`);
      }

      // Envoi async, ne bloque pas la nav. Skip si data saver.
      if (!conn?.saveData && shouldPersist) {
        supabase
          .from("page_performance_logs")
          .insert({
            route,
            load_time_ms: loadMs,
            ttfb_ms: ttfb ?? null,
            dom_ready_ms: domReady ?? null,
            fcp_ms: fcp ?? null,
            connection_type: conn?.effectiveType ?? null,
            is_slow: isSlow,
            user_agent: navigator.userAgent.slice(0, 200),
          } as any)
          .then(() => {});
      }

      // Précharge les routes probables liées au contexte
      prefetchRelatedRoutes(route);
    };

    // Attendre 2 RAF pour capturer le rendu complet
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        // Petit délai supplémentaire pour les fetchs initiaux
        setTimeout(measure, 100);
      })
    );

    return () => cancelAnimationFrame(id);
  }, [location.pathname]);

  // Préchargement au démarrage
  useEffect(() => {
    prefetchLikelyRoutes();

    // Capture les erreurs JS non gérées
    const errorHandler = (e: ErrorEvent) => {
      const route = normalizeRoute(window.location.pathname);
      supabase
        .from("page_performance_logs")
        .insert({
          route,
          load_time_ms: 0,
          had_error: true,
          error_message: (e.message || "unknown").slice(0, 500),
          user_agent: navigator.userAgent.slice(0, 200),
        } as any)
        .then(() => {});
    };
    window.addEventListener("error", errorHandler);
    return () => window.removeEventListener("error", errorHandler);
  }, []);

  return null;
};

/** Normalise les routes dynamiques (ex: /produit/abc-123 -> /produit/:slug) */
const normalizeRoute = (path: string): string => {
  return path
    .replace(/\/produit\/[^/]+/, "/produit/:slug")
    .replace(/\/producteurs\/[^/]+/, "/producteurs/:name")
    .replace(/\/formations\/[^/]+/, "/formations/:id")
    .replace(/\/blog\/[^/]+/, "/blog/:slug")
    .replace(/\/order\/[^/]+/, "/order/:id")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":uuid");
};

/** Précharge les routes les plus probables depuis la route actuelle */
const prefetchRelatedRoutes = (route: string) => {
  if (route === "/") {
    prefetchRoute("/marketplace");
    prefetchRoute("/categories");
  } else if (route === "/marketplace" || route === "/categories") {
    prefetchRoute("/cart");
    prefetchRoute("/favorites");
  } else if (route.startsWith("/produit")) {
    prefetchRoute("/cart");
    prefetchRoute("/messages");
  } else if (route === "/auth") {
    prefetchRoute("/dashboard");
    prefetchRoute("/buyer-dashboard");
  } else if (route.includes("dashboard")) {
    prefetchRoute("/notifications");
    prefetchRoute("/messages");
    prefetchRoute("/settings");
  }
};

export default PerformanceTracker;
