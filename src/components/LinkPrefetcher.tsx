import { useEffect } from "react";
import { prefetchRoute } from "@/lib/routePrefetch";

/**
 * Délégation globale : quand l'utilisateur survole / focus / touche un lien
 * interne, on précharge le chunk de la route correspondante.
 * Évite d'avoir à modifier chaque <Link> individuellement.
 */
export const LinkPrefetcher = () => {
  useEffect(() => {
    const seen = new WeakSet<Element>();

    const tryPrefetch = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!link || seen.has(link)) return;
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      seen.add(link);
      prefetchRoute(href);
    };

    const onPointer = (e: Event) => tryPrefetch(e.target);

    document.addEventListener("pointerenter", onPointer, true);
    document.addEventListener("focusin", onPointer, true);
    document.addEventListener("touchstart", onPointer, { capture: true, passive: true });

    return () => {
      document.removeEventListener("pointerenter", onPointer, true);
      document.removeEventListener("focusin", onPointer, true);
      document.removeEventListener("touchstart", onPointer, true);
    };
  }, []);

  return null;
};

export default LinkPrefetcher;
