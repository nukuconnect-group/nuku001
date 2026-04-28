import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "nukuconnect-cookie-consent";

const getOrCreateSessionId = () => {
  let sid = localStorage.getItem("nukuconnect-session-id");
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem("nukuconnect-session-id", sid);
  }
  return sid;
};

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Delay to avoid flashing during splash
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const recordConsent = async (consent: "accepted" | "ignored") => {
    localStorage.setItem(STORAGE_KEY, consent);
    setVisible(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("cookie_consents" as any).insert({
        user_id: user?.id ?? null,
        session_id: getOrCreateSessionId(),
        consent,
        user_agent: navigator.userAgent.slice(0, 500),
        page_path: window.location.pathname,
      });
    } catch (e) {
      console.warn("[cookie-consent] Failed to log:", e);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentement aux cookies"
      className="fixed bottom-0 left-0 right-0 z-[60] p-3 sm:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-xl border border-border bg-background/95 backdrop-blur shadow-elevated p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-start gap-3">
          <div className="flex items-center gap-2 sm:flex-col sm:items-center">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Cookie className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-sm font-semibold text-foreground mb-1">
              Nous utilisons des cookies
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
              Nukuconnect utilise des cookies pour améliorer votre expérience, mémoriser vos
              préférences et analyser le trafic. Consultez notre{" "}
              <Link to="/privacy" className="text-primary hover:underline font-medium">
                politique de confidentialité
              </Link>
              .
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => recordConsent("ignored")}
                className="w-full sm:w-auto gap-1.5 text-xs h-8"
              >
                <X className="w-3.5 h-3.5" />
                Ignorer
              </Button>
              <Button
                variant="hero"
                size="sm"
                onClick={() => recordConsent("accepted")}
                className="w-full sm:w-auto gap-1.5 text-xs h-8"
              >
                <Check className="w-3.5 h-3.5" />
                Accepter
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
