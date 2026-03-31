import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const checkInstalled = useCallback(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);
    return isStandalone;
  }, []);

  useEffect(() => {
    checkInstalled();

    // Listen for display-mode changes (uninstall detection)
    const mq = window.matchMedia("(display-mode: standalone)");
    const handleChange = () => {
      const standalone = mq.matches;
      setIsInstalled(standalone);
      if (!standalone) {
        // App was uninstalled - reset so prompt can fire again
        setDeferredPrompt(null);
      }
    };
    mq.addEventListener("change", handleChange);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
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
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === "accepted") {
        setIsInstalled(true);
        return true;
      }
      return false;
    }
    // No deferred prompt available - show manual instructions
    return null;
  };

  return {
    canInstall: !!deferredPrompt,
    isInstalled,
    install,
    // Show install option if not installed (even without deferred prompt)
    showInstallOption: !isInstalled,
  };
}
