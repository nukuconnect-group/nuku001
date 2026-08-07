import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getPendingPayment, clearPendingPayment } from "@/lib/solimi";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import SEO from "@/components/SEO";
import { invokeAuthenticatedFunction } from "@/lib/edgeFunctions";

type CallbackStatus = "loading" | "success" | "failed" | "expired";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);

  const paymentStatus = searchParams.get("paymentStatus");
  const paymentId = searchParams.get("paymentId");

  const finalize = useCallback(async () => {
    const pending = getPendingPayment();
    const payment_id = paymentId || pending?.paymentId;
    if (!payment_id) {
      setStatus("expired");
      setMessage("Aucun paiement SOLIMI en attente trouvé. Retournez à la page précédente.");
      return;
    }

    setProcessing(true);
    try {
      const result = await invokeAuthenticatedFunction<any>("solimi-verify", {
        payment_id,
        context: pending?.context,
        context_data: pending?.contextData || {},
      });
      if (result.error) throw new Error(result.error || "Vérification SOLIMI impossible");

      if (result.status === "success") {
        clearPendingPayment();
        setStatus("success");
        setMessage("Paiement confirmé et opération finalisée automatiquement.");
        toast({ title: "✅ Paiement confirmé", description: "SOLIMI a confirmé le paiement." });
        const ctx = result.transaction?.context || pending?.context;
        const ctxData = result.transaction?.context_data || pending?.contextData || {};
        setTimeout(() => {
          if (ctx === "cart" && ctxData.orderIds?.length === 1) navigate(`/commande/${ctxData.orderIds[0]}`);
          else if (ctx === "tokens") navigate("/jetons");
          else if (ctx === "plan") navigate("/plans");
          else if (ctx === "formation" && ctxData.formationId) navigate(`/formations/${ctxData.formationId}`);
          else navigate("/suivi-paiement");
        }, 2500);
        return;
      }

      if (result.status === "failed" || result.status === "cancelled") {
        clearPendingPayment();
        setStatus("failed");
        setMessage("Le paiement SOLIMI a échoué ou a été annulé. Aucun montant confirmé n’a été finalisé.");
        return;
      }

      setStatus("loading");
      setMessage("Paiement encore en attente chez SOLIMI. Vous pouvez suivre ou vérifier manuellement.");
      setTimeout(() => navigate("/suivi-paiement"), 1500);
    } catch (err: any) {
      console.error("Payment callback error:", err);
      setStatus("failed");
      setMessage(err.message || "Erreur lors de la vérification sécurisée du paiement.");
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  }, [paymentId, navigate, toast]);

  useEffect(() => {
    finalize();
  }, [finalize]);

  const getIcon = () => {
    switch (status) {
      case "loading": return <Loader2 className="w-12 h-12 text-primary animate-spin" />;
      case "success": return <CheckCircle2 className="w-12 h-12 text-primary" />;
      case "failed": return <XCircle className="w-12 h-12 text-destructive" />;
      case "expired": return <AlertTriangle className="w-12 h-12 text-amber-500" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case "loading": return "Traitement du paiement...";
      case "success": return "Paiement confirmé ✅";
      case "failed": return "Paiement échoué";
      case "expired": return "Session expirée";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SEO url="/payment-callback" title="Résultat du paiement" description="Résultat de votre paiement sur NukuConnect" noIndex />
      <Header />
      <main className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">{getIcon()}</div>
            <h1 className="font-heading text-xl font-bold">{getTitle()}</h1>
            <p className="text-sm text-muted-foreground">{message || "Veuillez patienter..."}</p>

            {processing && (
              <div className="flex items-center justify-center gap-2 text-xs text-primary">
                <Loader2 className="w-4 h-4 animate-spin" /> Finalisation en cours...
              </div>
            )}

            {(status === "failed" || status === "expired") && (
              <div className="flex flex-col gap-2 pt-2">
                <Button variant="hero" onClick={() => navigate(-1)}>
                  Réessayer
                </Button>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Retour à l'accueil
                </Button>
              </div>
            )}

            {status === "success" && (
              <p className="text-xs text-muted-foreground">Redirection automatique dans 3 secondes...</p>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default PaymentCallback;
