import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Star, TrendingUp, Crown, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import SupplierKYCForm from "./SupplierKYCForm";

interface Props {
  userId?: string;
  plan?: string;
  isVerified?: boolean;
}

const SupplierVerificationPopup = ({ userId, plan, isVerified }: Props) => {
  const [open, setOpen] = useState(false);
  const [hasKyc, setHasKyc] = useState<boolean | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!userId || isVerified) return;
    supabase
      .from("supplier_kyc_submissions")
      .select("id, status")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHasKyc(true);
        } else {
          setHasKyc(false);
          const dismissed = sessionStorage.getItem(`supplier_kyc_popup_${userId}`);
          if (!dismissed) {
            setTimeout(() => setOpen(true), 2000);
          }
        }
      });
  }, [userId, isVerified]);

  const handleDismiss = () => {
    if (userId) sessionStorage.setItem(`supplier_kyc_popup_${userId}`, "1");
    setOpen(false);
  };

  if (isVerified || hasKyc === null || hasKyc) return null;

  const isFree = !plan || plan === "free";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDismiss(); else setOpen(true); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-primary" />
            Devenez Premium pour développer votre réseau pro
          </DialogTitle>
          <DialogDescription className="text-xs">
            Trouvez des acheteurs rapidement, débloquez le badge vérifié et boostez vos produits.
          </DialogDescription>
        </DialogHeader>

        {showForm ? (
          <SupplierKYCForm userId={userId} onSubmitted={() => { setOpen(false); setHasKyc(true); }} />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              {[
                { icon: ShieldCheck, text: "Badge Vérifié animé sur votre profil et vos produits", color: "text-emerald-600" },
                { icon: Star, text: "Vos produits mis en avant dans les recherches", color: "text-yellow-500" },
                { icon: TrendingUp, text: "Jusqu'à 3x plus de ventes & d'opportunités", color: "text-blue-600" },
              ].map(({ icon: Icon, text, color }) => (
                <div key={text} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                  <span className="text-xs">{text}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold">Vérification KYC gratuite pour tous</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Soumettez votre dossier KYC dès maintenant pour obtenir le badge vérifié — c'est gratuit, indépendant de votre plan.
              </p>
              <Button variant="hero" size="sm" className="w-full text-xs gap-1" onClick={() => setShowForm(true)}>
                <ShieldCheck className="w-3.5 h-3.5" />
                Commencer ma vérification
              </Button>
            </div>

            {isFree && (
              <div className="space-y-2 p-3 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-accent" />
                  <span className="text-xs font-semibold">Devenez Premium pour vendre plus</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Débloquez la traçabilité, NukuAI, boosts et bien plus à partir de 2 500 FCFA.
                </p>
                <Link to="/plans">
                  <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                    <Crown className="w-3.5 h-3.5" />
                    Voir les plans Premium
                  </Button>
                </Link>
              </div>
            )}

            <Button variant="ghost" size="sm" className="w-full text-[10px] text-muted-foreground" onClick={handleDismiss}>
              Plus tard
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SupplierVerificationPopup;
