import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Crown } from "lucide-react";
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

  if (isVerified) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-green-800">Fournisseur vérifié ✓</span>
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
