/**
 * Lightweight security guards for NUKUCONNECT.
 * Keeps core protections without expensive runtime traps that slow mobile devices.
 */

const IS_PROD = import.meta.env.PROD;
const PREVIEW_HOST_SNIPPETS = ["id-preview--", "lovableproject.com"];

let initialized = false;

function isPreviewHost() {
  return PREVIEW_HOST_SNIPPETS.some((snippet) => window.location.hostname.includes(snippet));
}

function preventIframeEmbedding() {
  if (window.self === window.top) return;

  try {
    window.top!.location.href = window.self.location.href;
  } catch {
    window.location.replace(window.self.location.href);
  }
}

function blockInspectionShortcuts() {
  document.addEventListener(
    "keydown",
    (event) => {
      const key = event.key.toUpperCase();
      const opensDevtools =
        key === "F12" ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && ["I", "J", "C"].includes(key)) ||
        ((event.ctrlKey || event.metaKey) && key === "U");

      if (!opensDevtools) return;

      event.preventDefault();
      event.stopPropagation();
    },
    { capture: true },
  );
}

function disableMediaDragging() {
  document.addEventListener(
    "dragstart",
    (event) => {
      const target = event.target;

      if (
        target instanceof HTMLImageElement ||
        target instanceof HTMLVideoElement ||
        target instanceof HTMLCanvasElement ||
        target instanceof SVGElement
      ) {
        event.preventDefault();
      }
    },
    { capture: true },
  );
}

function applyPrintGuard() {
  if (document.head.querySelector('style[data-security-print-guard="true"]')) return;

  const style = document.createElement("style");
  style.dataset.securityPrintGuard = "true";
  style.textContent = `
    @media print {
      body * { visibility: hidden !important; }

      body::after {
        content: "Impression désactivée - NUKUCONNECT";
        visibility: visible !important;
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 3rem;
        text-align: center;
        font-size: 1.25rem;
        font-weight: 700;
        color: hsl(var(--destructive));
        background: hsl(var(--background));
      }
    }
  `;

  document.head.appendChild(style);
}

function showConsoleWarning() {
  window.setTimeout(() => {
    console.info("%cNUKUCONNECT", "font-size: 20px; font-weight: 700;");
    console.info("Zone réservée aux développeurs autorisés.");
  }, 600);
}

export function initSecurity() {
  if (initialized || !IS_PROD || isPreviewHost()) return;

  initialized = true;

  preventIframeEmbedding();
  blockInspectionShortcuts();
  disableMediaDragging();
  applyPrintGuard();
  showConsoleWarning();
}
