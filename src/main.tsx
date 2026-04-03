import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSecurity } from "./utils/security";

type IdleCallback = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void;

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: IdleCallback, options?: { timeout: number }) => number;
  };

// PWA guard: disable service worker in iframes and preview hosts
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);

const scheduleSecurityInit = () => {
  const idleWindow = window as IdleWindow;

  if (typeof idleWindow.requestIdleCallback === "function") {
    idleWindow.requestIdleCallback(() => initSecurity(), { timeout: 1200 });
    return;
  }

  window.setTimeout(() => initSecurity(), 300);
};

scheduleSecurityInit();
