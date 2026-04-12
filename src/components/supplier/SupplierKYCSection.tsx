import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Crown, Clock, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import SupplierKYCForm from "./SupplierKYCForm";

interface Props {
  userId?: string;
  plan?: string;
  isVerified?: boolean;
}

/** Inline KYC card for supplier dashboard settings tab */
const SupplierKYCSection = ({ userId, plan, isVerified }: Props) => {
  const isFree = !plan || plan === "free";
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from("supplier_kyc_submissions")
      .select("status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setKycStatus(data?.status || null);
        setLoading(false);
      });
  }, [userId]);

  if (isVerified) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-green-800">Fournisseur vérifié ✓</span>
          <Badge className="bg-green-100 text-green-800 text-[9px] ml-auto">
            <CheckCircle2 className="w-3 h-3 mr-0.5" /> KYC Validé
          </Badge>
        </CardContent>
      </Card>
    );
  }

  if (kycStatus === "pending") {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-600" />
          <div className="flex-1">
            <span className="text-sm font-medium text-amber-800">KYC soumis — En cours de vérification</span>
            <p className="text-[10px] text-amber-600">Votre dossier est en cours d'examen par notre équipe.</p>
          </div>
          <Badge className="bg-amber-100 text-amber-800 text-[9px]">
            <Clock className="w-3 h-3 mr-0.5" /> En attente
          </Badge>
        </CardContent>
      </Card>
    );
  }

  if (kycStatus === "approved") {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-green-800">KYC Approuvé — Fournisseur vérifié ✓</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Vérification fournisseur (KYC)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {isFree ? (
          <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold">Réservé aux comptes Pro / Business</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Passez au plan Pro pour obtenir le badge vérifié, des commissions réduites et plus de visibilité.
            </p>
            <Link to="/plans">
              <Button variant="hero" size="sm" className="w-full text-xs gap-1">
                <Crown className="w-3.5 h-3.5" /> Passer au Pro
              </Button>
            </Link>
          </div>
        ) : (
          <SupplierKYCForm userId={userId} onSubmitted={() => window.location.reload()} />
        )}
      </CardContent>
    </Card>
  );
};

export default SupplierKYCSection;
