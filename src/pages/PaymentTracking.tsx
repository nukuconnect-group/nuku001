import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPendingPayment, clearPendingPayment } from "@/lib/solimi";
import { useToast } from "@/hooks/use-toast";

const PaymentTracking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState("pending");
  const pending = getPendingPayment();

  const verify = useCallback(async () => {
    if (!pending?.paymentId) return;
    setChecking(true);
    const { data, error } = await supabase.functions.invoke("solimi-verify", {
      body: { payment_id: pending.paymentId, context: pending.context, context_data: pending.contextData },
    });
    setChecking(false);
    const result = (data as any) || {};
    if (error || result.error) {
      toast({ title: "Vérification impossible", description: result.error || error?.message, variant: "destructive" });
      return;
    }
    setStatus(result.status || "pending");
    if (result.status === "success") {
      clearPendingPayment();
      toast({ title: "Paiement confirmé", description: "L'opération a été finalisée." });
      navigate("/payment-callback");
    }
  }, [pending, navigate, toast]);

  useEffect(() => { if (pending?.paymentId) verify(); }, []);

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SEO url="/suivi-paiement" title="Suivi paiement" description="Suivez et vérifiez votre paiement SOLIMI." noIndex />
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-xl">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="w-5 h-5 text-primary" />Suivi paiement SOLIMI</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {pending ? (
              <>
                <Badge variant="outline">Statut : {status}</Badge>
                <p className="text-sm text-muted-foreground">Référence : <span className="font-mono text-foreground">{pending.paymentId}</span></p>
                <Button onClick={verify} disabled={checking} className="w-full gap-2" variant="hero">
                  {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Vérifier maintenant
                </Button>
                {pending.checkoutUrl && <Button variant="outline" className="w-full" onClick={() => { window.location.href = pending.checkoutUrl; }}>Relancer le paiement</Button>}
              </>
            ) : (
              <div className="text-center space-y-3"><AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto" /><p className="text-sm text-muted-foreground">Aucun paiement en attente.</p><Button onClick={() => navigate("/marketplace")} variant="outline">Retour marketplace</Button></div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer /><MobileBottomNav />
    </div>
  );
};
export default PaymentTracking;
