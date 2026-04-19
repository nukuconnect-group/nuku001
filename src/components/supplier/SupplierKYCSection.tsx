import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import SupplierKYCForm from "./SupplierKYCForm";

interface Props {
  userId?: string;
  plan?: string;
  isVerified?: boolean;
}

/** KYC inline — ouvert à TOUS les fournisseurs (gratuit ou payant) */
const SupplierKYCSection = ({ userId, isVerified }: Props) => {
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

  if (isVerified || kycStatus === "approved") {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="p-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-800">Fournisseur vérifié ✓</span>
          <Badge className="bg-emerald-100 text-emerald-800 text-[9px] ml-auto">
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
            <p className="text-[10px] text-amber-600">Votre dossier est examiné par notre équipe.</p>
          </div>
          <Badge className="bg-amber-100 text-amber-800 text-[9px]">
            <Clock className="w-3 h-3 mr-0.5" /> En attente
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Vérification fournisseur (KYC) — Gratuit
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <p className="text-[10px] text-muted-foreground mb-3">
          Disponible pour tous les fournisseurs. Obtenez le badge vérifié pour gagner la confiance des acheteurs et augmenter vos ventes.
        </p>
        <SupplierKYCForm userId={userId} onSubmitted={() => window.location.reload()} />
      </CardContent>
    </Card>
  );
};

export default SupplierKYCSection;
