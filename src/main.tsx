import { createRoot } from "react-dom/client";
import "./index.css";
import { initSecurity } from "./utils/security";

type IdleCallback = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void;

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: IdleCallback, options?: { timeout: number }) => number;
  };

const patchNavigatorLocks = () => {
  const nav = window.navigator as Navigator & {
    locks?: {
      request?: (...args: any[]) => Promise<any>;
      __nukuconnectPatched?: boolean;
    };
  };

  if (!nav.locks?.request || nav.locks.__nukuconnectPatched) return;

  const originalRequest = nav.locks.request.bind(nav.locks);
  const patchedRequest = async (...args: any[]) => {
    try {
      return await originalRequest(...args);
    } catch {
      const callback = args[args.length - 1];
      if (typeof callback === "function") {
        return await callback({
          name: typeof args[0] === "string" ? args[0] : "nukuconnect-lock",
        });
      }
      throw new Error("Navigator locks unavailable");
    }
  };

  try {
    Object.defineProperty(nav.locks, "request", {
      configurable: true,
      writable: true,
      value: patchedRequest,
    });
  } catch {
    (nav.locks as any).request = patchedRequest;
  }

  nav.locks.__nukuconnectPatched = true;
};

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const scheduleSecurityInit = () => {
  const idleWindow = window as IdleWindow;

  if (typeof idleWindow.requestIdleCallback === "function") {
    idleWindow.requestIdleCallback(() => initSecurity(), { timeout: 1200 });
    return;
  }

  window.setTimeout(() => initSecurity(), 300);
};

// Auto-récupération si un chunk lazy échoue à charger (déploiement obsolète).
// Sans ça, l'utilisateur reste bloqué sur "Échec du chargement" sur mobile.
const CHUNK_RELOAD_KEY = "nk_boot_reload_at";
const handleChunkFailure = (err: unknown) => {
  const msg = (err as Error)?.message || String(err || "");
  const isChunk =
    msg.includes("dynamically imported module") ||
    msg.includes("Failed to fetch dynamically imported") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Loading chunk");
  if (!isChunk) return;
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || "0");
    if (Date.now() - last < 30_000) return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    window.location.reload();
  } catch { /* noop */ }
};
window.addEventListener("error", (e) => handleChunkFailure(e.error || e.message));
window.addEventListener("unhandledrejection", (e) => handleChunkFailure(e.reason));

const bootstrap = async () => {
  patchNavigatorLocks();
  try {
    const { default: App } = await import("./App.tsx");
    createRoot(rootElement).render(<App />);
    scheduleSecurityInit();
  } catch (err) {
    handleChunkFailure(err);
    throw err;
  }
};

void bootstrap();

