import SEO from "@/components/SEO";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, MailX } from "lucide-react";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "valid" | "already" | "invalid" | "success" | "error">("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    const validate = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const data = await res.json();
        if (res.ok && data.valid === true) {
          setStatus("valid");
        } else if (data.reason === "already_unsubscribed") {
          setStatus("already");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) {
        setStatus("success");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex items-center justify-center px-4">
      <SEO title="Désinscription" description="Gérez vos préférences d'email NukuConnect." noIndex />
      <Card className="max-w-md w-full">
        <CardContent className="py-10 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
              <p className="text-muted-foreground text-sm">Vérification en cours…</p>
            </>
          )}

          {status === "valid" && (
            <>
              <MailX className="w-14 h-14 mx-auto text-destructive" />
              <h2 className="text-lg font-semibold">Se désabonner des emails</h2>
              <p className="text-sm text-muted-foreground">
                Vous ne recevrez plus d'emails de NukuConnect. Cette action est irréversible.
              </p>
              <Button
                variant="destructive"
                onClick={handleUnsubscribe}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Confirmer le désabonnement
              </Button>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-14 h-14 mx-auto text-green-500" />
              <h2 className="text-lg font-semibold">Désabonnement confirmé</h2>
              <p className="text-sm text-muted-foreground">
                Vous avez été désabonné avec succès. Vous ne recevrez plus d'emails de NukuConnect.
              </p>
            </>
          )}

          {status === "already" && (
            <>
              <CheckCircle className="w-14 h-14 mx-auto text-muted-foreground" />
              <h2 className="text-lg font-semibold">Déjà désabonné</h2>
              <p className="text-sm text-muted-foreground">
                Vous êtes déjà désabonné des emails NukuConnect.
              </p>
            </>
          )}

          {status === "invalid" && (
            <>
              <XCircle className="w-14 h-14 mx-auto text-destructive" />
              <h2 className="text-lg font-semibold">Lien invalide</h2>
              <p className="text-sm text-muted-foreground">
                Ce lien de désabonnement est invalide ou a expiré.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-14 h-14 mx-auto text-destructive" />
              <h2 className="text-lg font-semibold">Erreur</h2>
              <p className="text-sm text-muted-foreground">
                Une erreur est survenue. Veuillez réessayer plus tard.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
