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

const bootstrap = async () => {
  patchNavigatorLocks();
  const { default: App } = await import("./App.tsx");
  createRoot(rootElement).render(<App />);
  scheduleSecurityInit();
};

void bootstrap();
