import { useEffect } from "react";
import { prefetchRoute, type PrefetchTrigger } from "@/lib/routePrefetch";

/**
 * Délégation globale : précharge la route ciblée par un lien interne.
 * Le trigger varie selon l'événement, ce qui permet au mode "faible
 * connexion" de filtrer (ex: en 2G/3G on ignore le hover et on garde
 * uniquement focus / touch).
 */
export const LinkPrefetcher = () => {
  useEffect(() => {
    const seen = new WeakSet<Element>();

    const tryPrefetch = (target: EventTarget | null, trigger: PrefetchTrigger) => {
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!link || seen.has(link)) return;
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      seen.add(link);
      prefetchRoute(href, trigger);
    };

    const onHover = (e: Event) => tryPrefetch(e.target, "hover");
    const onFocus = (e: Event) => tryPrefetch(e.target, "focus");
    const onTouch = (e: Event) => tryPrefetch(e.target, "touch");

    document.addEventListener("pointerenter", onHover, true);
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("touchstart", onTouch, { capture: true, passive: true });

    return () => {
      document.removeEventListener("pointerenter", onHover, true);
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("touchstart", onTouch, true);
    };
  }, []);

  return null;
};

export default LinkPrefetcher;
