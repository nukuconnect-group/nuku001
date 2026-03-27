/**
 * Advanced Security Shield for NUKUCONNECT
 * Multi-layer protection against inspection, cloning, and tampering
 */

const IS_PROD = import.meta.env.PROD;

// ─── Layer 1: Anti-iframe / Clickjacking ─────────────────────────
function preventIframeEmbedding() {
  if (window.self !== window.top) {
    try {
      window.top!.location.href = window.self.location.href;
    } catch {
      document.documentElement.innerHTML = "";
    }
  }
}

// ─── Layer 2: DevTools Detection & Response ──────────────────────
function detectDevTools() {
  if (!IS_PROD) return;

  // Method 1: debugger trap with interval
  const devtoolsCheck = () => {
    const start = performance.now();
    // This debugger statement pauses execution when DevTools is open
    // eslint-disable-next-line no-debugger
    debugger;
    const duration = performance.now() - start;
    // If devtools is open, debugger pauses > 100ms
    if (duration > 100) {
      document.documentElement.innerHTML = "";
      window.location.replace("about:blank");
    }
  };

  // Run periodically
  setInterval(devtoolsCheck, 3000);

  // Method 2: Console output detection
  const element = new Image();
  Object.defineProperty(element, "id", {
    get: function () {
      // Console is open if this getter is called (console.log triggers toString/id)
      document.documentElement.innerHTML = "";
      window.location.replace("about:blank");
      return "";
    },
  });
  // Periodically push to console to trigger detection
  setInterval(() => {
    console.log("%c", element as any);
  }, 4000);

  // Method 3: Window size differential detection
  const threshold = 160;
  const checkWindowSize = () => {
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    if (widthDiff > threshold || heightDiff > threshold) {
      document.title = "⚠️";
      // Don't blank immediately on size — could be OS chrome
      // But log a warning
    }
  };
  window.addEventListener("resize", checkWindowSize);
}

// ─── Layer 3: Disable all inspection shortcuts ───────────────────
function blockShortcuts() {
  if (!IS_PROD) return;

  document.addEventListener("keydown", (e) => {
    // F12
    if (e.key === "F12") { e.preventDefault(); return false; }
    // Ctrl/Cmd + Shift + I/J/C/K (DevTools variants)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && /^[IJCK]$/i.test(e.key)) {
      e.preventDefault(); return false;
    }
    // Ctrl/Cmd + U (View Source)
    if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === "U") {
      e.preventDefault(); return false;
    }
    // Ctrl/Cmd + S (Save)
    if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === "S") {
      e.preventDefault(); return false;
    }
    // Ctrl/Cmd + P (Print — can reveal source)
    if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === "P") {
      e.preventDefault(); return false;
    }
    // Ctrl/Cmd + A (Select All — prevent bulk copy)
    if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === "A") {
      e.preventDefault(); return false;
    }
    // Ctrl/Cmd + C in non-input elements
    if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === "C") {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault(); return false;
      }
    }
  }, { capture: true });
}

// ─── Layer 4: Block right-click & content menus ──────────────────
function blockContextMenu() {
  if (!IS_PROD) return;
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    return false;
  }, { capture: true });
}

// ─── Layer 5: Disable text/image selection & drag ────────────────
function blockSelectionAndDrag() {
  if (!IS_PROD) return;

  const style = document.createElement("style");
  style.textContent = `
    body, img, video, canvas, svg, .no-select {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
      -webkit-user-drag: none !important;
      -webkit-touch-callout: none !important;
    }
    input, textarea, [contenteditable="true"], select {
      -webkit-user-select: text !important;
      user-select: text !important;
    }
  `;
  document.head.appendChild(style);

  // Block all drag events
  document.addEventListener("dragstart", (e) => { e.preventDefault(); }, { capture: true });
  // Block copy event on non-input elements
  document.addEventListener("copy", (e) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag !== "INPUT" && tag !== "TEXTAREA") {
      e.preventDefault();
    }
  }, { capture: true });
  // Block cut
  document.addEventListener("cut", (e) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag !== "INPUT" && tag !== "TEXTAREA") {
      e.preventDefault();
    }
  }, { capture: true });
}

// ─── Layer 6: Console poisoning ──────────────────────────────────
function poisonConsole() {
  if (!IS_PROD) return;

  const noop = () => {};
  const warning = () => {
    console.clear();
    console.log(
      "%c⛔ STOP!",
      "color: red; font-size: 48px; font-weight: bold; text-shadow: 2px 2px black;"
    );
    console.log(
      "%cCette fonctionnalité est réservée aux développeurs NUKUCONNECT.\nToute tentative d'accès non autorisé est interdite et surveillée.",
      "color: #333; font-size: 16px;"
    );
  };

  // Override console methods after initial warning
  setTimeout(() => {
    warning();
    const methods: (keyof Console)[] = ["log", "debug", "info", "warn", "error", "table", "trace", "dir", "dirxml", "group", "groupEnd", "time", "timeEnd", "profile", "profileEnd"];
    methods.forEach((method) => {
      try {
        (console as any)[method] = noop;
      } catch {}
    });
  }, 2000);
}

// ─── Layer 7: Tamper detection on critical globals ───────────────
function protectGlobals() {
  if (!IS_PROD) return;

  // Detect if someone overrides fetch or XMLHttpRequest
  const originalFetch = window.fetch;
  const originalXHR = window.XMLHttpRequest;

  Object.defineProperty(window, "fetch", {
    get: () => originalFetch,
    set: () => { /* silently ignore override attempts */ },
    configurable: false,
  });

  Object.defineProperty(window, "XMLHttpRequest", {
    get: () => originalXHR,
    set: () => { /* silently ignore override attempts */ },
    configurable: false,
  });
}

// ─── Layer 8: Anti print-screen / print ──────────────────────────
function blockPrint() {
  if (!IS_PROD) return;

  // CSS to hide content during print
  const style = document.createElement("style");
  style.textContent = `
    @media print {
      body * { display: none !important; }
      body::after {
        content: "⚠️ Impression non autorisée - NUKUCONNECT";
        display: block !important;
        font-size: 24px;
        text-align: center;
        padding: 100px;
        color: red;
      }
    }
  `;
  document.head.appendChild(style);

  window.addEventListener("beforeprint", () => {
    document.body.style.visibility = "hidden";
  });
  window.addEventListener("afterprint", () => {
    document.body.style.visibility = "visible";
  });
}

// ═══════════════════════════════════════════════════════════════════
// Initialize all security layers
// ═══════════════════════════════════════════════════════════════════
export function initSecurity() {
  preventIframeEmbedding();
  blockContextMenu();
  blockShortcuts();
  blockSelectionAndDrag();
  blockPrint();
  poisonConsole();
  protectGlobals();

  // DevTools detection — slight delay to not impact initial render
  setTimeout(() => {
    detectDevTools();
  }, 1500);
}
