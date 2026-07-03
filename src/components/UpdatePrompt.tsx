import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

/**
 * Polls /version.json every 60s. When the deployed build id no longer
 * matches the one baked into this bundle, we know a new version has
 * shipped and show a discrete banner asking the user to reload.
 *
 * Works for both the PWA (installed on phone / Play Store WebView) and
 * the plain web app. Skipped inside the Lovable preview iframe.
 */
export default function UpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const currentBuildId = useRef<string>(
    typeof __APP_BUILD_ID__ !== "undefined" ? __APP_BUILD_ID__ : "",
  );

  useEffect(() => {
    if (!currentBuildId.current) return;
    if (typeof window === "undefined") return;

    // Never nag inside Lovable preview / iframes.
    try {
      if (window.self !== window.top) return;
    } catch {
      return;
    }
    const host = window.location.hostname;
    if (host.includes("id-preview--") || host.includes("lovableproject.com")) {
      return;
    }

    let cancelled = false;

    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
          credentials: "omit",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { buildId?: string };
        if (cancelled) return;
        if (data.buildId && data.buildId !== currentBuildId.current) {
          setShowUpdate(true);
        }
      } catch {
        /* offline / network flake — try again next tick */
      }
    };

    // First check after ~20s so we don't flash on cold boot, then every 60s
    // and every time the tab regains focus.
    const initial = window.setTimeout(checkVersion, 20_000);
    const interval = window.setInterval(checkVersion, 60_000);
    const onFocus = () => { void checkVersion(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  const reload = async () => {
    try {
      // Purge every Cache Storage bucket owned by our origin so the reload
      // actually fetches fresh HTML/JS/CSS instead of the stale PWA cache.
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      // Ask the current service worker (if any) to activate the waiting one.
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      }
    } catch {
      /* best-effort */
    }
    window.location.reload();
  };

  if (!showUpdate || dismissed) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[min(92vw,420px)]"
    >
      <div className="rounded-xl border border-primary/30 bg-card/95 backdrop-blur shadow-elevated p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
          <RefreshCw className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">
            Nouvelle version disponible
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Rechargez pour bénéficier des dernières améliorations.
          </p>
        </div>
        <Button size="sm" variant="hero" onClick={reload} className="h-8 text-xs">
          Recharger
        </Button>
        <button
          aria-label="Ignorer"
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
