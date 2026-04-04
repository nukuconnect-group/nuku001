import { useState, useEffect, useCallback, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Persist the deferred prompt at module level so it survives re-renders
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  const wasUninstalled = useRef(false);

  const checkInstalled = useCallback(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);
    return isStandalone;
  }, []);

  useEffect(() => {
    checkInstalled();

    const mq = window.matchMedia("(display-mode: standalone)");
    const handleChange = () => {
      const standalone = mq.matches;
      setIsInstalled(standalone);
      if (!standalone) {
        // App was uninstalled — mark so we know to re-prompt
        wasUninstalled.current = true;
        globalDeferredPrompt = null;
        setDeferredPrompt(null);
      }
    };
    mq.addEventListener("change", handleChange);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      wasUninstalled.current = false;
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      mq.removeEventListener("change", handleChange);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [checkInstalled]);

  const install = async () => {
    // Use the global prompt if component-level one is stale
    const prompt = deferredPrompt || globalDeferredPrompt;
    if (prompt) {
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        globalDeferredPrompt = null;
        setDeferredPrompt(null);
        if (outcome === "accepted") {
          setIsInstalled(true);
          return true;
        }
        return false;
      } catch {
        // prompt() can only be called once — treat as no prompt available
        globalDeferredPrompt = null;
        setDeferredPrompt(null);
      }
    }
    // No deferred prompt available — show manual instructions
    return null;
  };

  return {
    canInstall: !!(deferredPrompt || globalDeferredPrompt),
    isInstalled,
    install,
    showInstallOption: !isInstalled,
  };
}
