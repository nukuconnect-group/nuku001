import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getPendingPayment, clearPendingPayment } from "@/lib/moneroo";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import SEO from "@/components/SEO";
import { getFreshAuthSession, invokeAuthenticatedFunction } from "@/lib/edgeFunctions";

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
    if (!pending) {
      setStatus("expired");
      setMessage("Aucun paiement en attente trouvé. Retournez à la page précédente.");
      return;
    }

    const isSuccess = paymentStatus === "success" || paymentStatus === "completed";

    if (!isSuccess) {
      setStatus("failed");
      setMessage("Le paiement n'a pas abouti. Aucun montant n'a été débité.");
      clearPendingPayment();
      return;
    }

    setProcessing(true);
    const { context, contextData } = pending;
    const txId = paymentId || pending.paymentId || `moneroo-${Date.now()}`;

    try {
      if (context === "plan") {
        // Activate subscription
        let session;
        try { session = await getFreshAuthSession(); } catch {
          toast({ title: "Session expirée", description: "Reconnectez-vous.", variant: "destructive" });
          setStatus("failed");
          setMessage("Session expirée. Reconnectez-vous et réessayez.");
          return;
        }
        const data = await invokeAuthenticatedFunction<{ error?: string }>("update-subscription", {
          plan: contextData.planId,
          billing_period: "annual",
          payment_identifier: txId,
        }, session);
        if (data?.error) throw new Error(data.error);

        await supabase.from("notifications").insert({
          user_id: session.user.id,
          type: "subscription",
          title: `🎉 Plan ${contextData.planName || contextData.planId} activé !`,
          description: `Votre abonnement a été activé avec succès.`,
        });

        toast({ title: "🎉 Abonnement activé !", description: `Plan ${contextData.planName || contextData.planId} activé.` });
        clearPendingPayment();
        setStatus("success");
        setMessage(`Plan ${contextData.planName || contextData.planId} activé avec succès !`);
        setTimeout(() => navigate("/plans"), 3000);

      } else if (context === "tokens") {
        // Complete token purchase
        const { data: pid, error: pidErr } = await supabase.rpc("create_token_purchase", {
          p_pack_code: contextData.packCode,
          p_payment_identifier: txId,
        });
        if (pidErr) throw pidErr;

        const { error } = await supabase.rpc("complete_token_purchase", {
          p_purchase_id: pid as unknown as string,
          p_payment_reference: txId,
        });
        if (error) throw error;

        toast({ title: "🎁 Jetons crédités !", description: "Votre solde a été mis à jour." });
        clearPendingPayment();
        setStatus("success");
        setMessage("Jetons crédités avec succès !");
        setTimeout(() => navigate("/jetons"), 3000);

      } else if (context === "formation") {
        // Enroll in paid formation
        const { data, error } = await supabase.functions.invoke("enroll-paid-formation", {
          body: { formation_id: contextData.formationId, identifier: txId, tx_reference: txId },
        });
        if (error || !(data as any)?.success) throw new Error((data as any)?.error || error?.message || "Erreur inscription");

        toast({ title: "✅ Inscription confirmée", description: "Vous avez maintenant accès à la formation." });
        clearPendingPayment();
        setStatus("success");
        setMessage("Inscription à la formation confirmée !");
        setTimeout(() => navigate(`/formations/${contextData.formationId}`), 3000);

      } else if (context === "cart") {
        // Finalize cart orders
        const orderIds: string[] = contextData.orderIds || [];
        for (const orderId of orderIds) {
          await supabase.from("orders")
            .update({ status: "confirmed", notes: `Paiement Moneroo confirmé | ${txId}` })
            .eq("id", orderId)
            .eq("status", "pending");
        }

        // Send order confirmation email
        if (contextData.buyerEmail) {
          supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "order-confirmation",
              recipientEmail: contextData.buyerEmail,
              idempotencyKey: `order-confirm-${txId}`,
              templateData: contextData.emailData || {},
            },
          }).catch(() => {});
        }

        // Notify buyer
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from("notifications").insert({
            user_id: session.user.id,
            type: "order",
            title: "✅ Commande confirmée !",
            description: `Votre commande a été confirmée. Paiement reçu.`,
          });
        }

        toast({ title: "✅ Commande confirmée !", description: "Votre paiement a été reçu." });
        clearPendingPayment();
        setStatus("success");
        setMessage("Commande confirmée avec succès !");
        setTimeout(() => {
          if (orderIds.length === 1) navigate(`/commande/${orderIds[0]}`);
          else navigate("/suivi-livraison");
        }, 3000);

      } else {
        clearPendingPayment();
        setStatus("success");
        setMessage("Paiement confirmé !");
        setTimeout(() => navigate("/"), 3000);
      }
    } catch (err: any) {
      console.error("Payment callback error:", err);
      setStatus("failed");
      setMessage(err.message || "Erreur lors de la finalisation du paiement.");
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  }, [paymentStatus, paymentId, navigate, toast]);

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
