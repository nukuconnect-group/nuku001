/**
 * Security utilities for NUKUCONNECT
 * Protects against iframe embedding, dev tools inspection, and content theft
 */

// Prevent iframe embedding (clickjacking protection)
export function preventIframeEmbedding() {
  if (window.self !== window.top) {
    try {
      window.top!.location.href = window.self.location.href;
    } catch {
      // If cross-origin, blank the page
      document.body.innerHTML = "";
      document.body.style.display = "none";
    }
  }
}

// Disable right-click context menu in production
export function disableContextMenu() {
  if (import.meta.env.PROD) {
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      return false;
    });
  }
}

// Disable text selection on sensitive areas in production
export function disableTextSelection() {
  if (import.meta.env.PROD) {
    const style = document.createElement("style");
    style.textContent = `
      img, video, .no-select {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-user-drag: none;
      }
    `;
    document.head.appendChild(style);
  }
}

// Disable common keyboard shortcuts for dev tools & source viewing in production
export function disableDevToolsShortcuts() {
  if (import.meta.env.PROD) {
    document.addEventListener("keydown", (e) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Dev Tools)
      if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key.toUpperCase() === "U") {
        e.preventDefault();
        return false;
      }
      // Ctrl+S (Save Page)
      if (e.ctrlKey && e.key.toUpperCase() === "S") {
        e.preventDefault();
        return false;
      }
    });
  }
}

// Disable drag on images to prevent easy downloading
export function disableImageDrag() {
  if (import.meta.env.PROD) {
    document.addEventListener("dragstart", (e) => {
      if ((e.target as HTMLElement)?.tagName === "IMG") {
        e.preventDefault();
      }
    });
  }
}

// Initialize all security measures
export function initSecurity() {
  preventIframeEmbedding();
  disableContextMenu();
  disableTextSelection();
  disableDevToolsShortcuts();
  disableImageDrag();
}
