import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Clock, CheckCircle2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import SupplierKYCForm from "./SupplierKYCForm";

interface Props {
  userId?: string;
  plan?: string;
  isVerified?: boolean;
}

/** KYC inline — Accordéon fermé par défaut, l'utilisateur doit cliquer pour ouvrir */
const SupplierKYCSection = ({ userId, isVerified }: Props) => {
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const refreshStatus = () => {
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
  };

  useEffect(() => {
    refreshStatus();
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
            <p className="text-[10px] text-amber-600">Votre dossier est examiné par notre équipe (24-48h).</p>
          </div>
          <Badge className="bg-amber-100 text-amber-800 text-[9px]">
            <Clock className="w-3 h-3 mr-0.5" /> En attente
          </Badge>
        </CardContent>
      </Card>
    );
  }

  // Default: closed accordion - user must click to open
  return (
    <Card className={`overflow-hidden transition-all ${open ? "border-primary/40" : "border-border hover:border-primary/30"}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
        aria-expanded={open}
      >
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">Vérification fournisseur (KYC)</span>
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-emerald-300 text-emerald-700">Gratuit</Badge>
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {kycStatus === "rejected"
              ? "❌ KYC refusé — Cliquez pour resoumettre"
              : "Cliquez pour ouvrir le formulaire et obtenir le badge vérifié"}
          </p>
        </div>
        {kycStatus === "rejected" && (
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
        )}
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border p-3 bg-muted/20 animate-fade-in">
          <div className="mb-3 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-[11px] text-foreground leading-relaxed">
              <strong className="text-primary">Pourquoi vérifier votre compte ?</strong>
              <br />
              Obtenez le badge vérifié pour gagner la confiance des acheteurs, augmenter vos ventes et débloquer toutes les fonctionnalités de la plateforme.
            </p>
            <ul className="mt-2 text-[10px] text-muted-foreground space-y-0.5">
              <li>✓ Badge "Vérifié" sur tous vos produits</li>
              <li>✓ Priorité dans les recommandations IA</li>
              <li>✓ Accès aux retraits sécurisés</li>
              <li>✓ Vérification gratuite en 24-48h</li>
            </ul>
          </div>
          <SupplierKYCForm
            userId={userId}
            onSubmitted={() => {
              setOpen(false);
              refreshStatus();
            }}
          />
        </div>
      )}
    </Card>
  );
};

export default SupplierKYCSection;
