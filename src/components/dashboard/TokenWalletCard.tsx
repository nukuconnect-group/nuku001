import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, ArrowRight, Plus, History, Calendar, Loader2 } from "lucide-react";
import { useTokens } from "@/hooks/useTokens";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/** Portefeuille de jetons : solde + achats actifs + historique récent */
const TokenWalletCard = () => {
  const { balance, purchases, transactions, loading } = useTokens();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const activePurchases = purchases.filter((p) => p.payment_status === "completed" && new Date(p.expires_at) > new Date());
  const totalPurchased = activePurchases.reduce((sum, p) => sum + (p.tokens_purchased || 0), 0);
  const totalSpent = totalPurchased - balance;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-3 sm:p-5 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Mon portefeuille
            </CardTitle>
            <CardDescription className="text-[10px] sm:text-xs mt-1">
              Vos jetons NukuConnect
            </CardDescription>
          </div>
          <Link to="/jetons">
            <Button variant="hero" size="sm" className="text-[10px] sm:text-xs h-8 gap-1">
              <Plus className="w-3 h-3" /> Acheter
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-5 space-y-4">
        {/* Solde principal */}
        <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">Solde disponible</p>
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="font-heading text-3xl sm:text-4xl font-bold text-primary">{balance}</span>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">jeton{balance > 1 ? "s" : ""}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-1">
            1 jeton = 1 boost produit ou 1 traçabilité
          </p>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-muted/50">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">Achetés</p>
            <p className="font-heading font-bold text-sm sm:text-base text-foreground">{totalPurchased}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/50">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">Utilisés</p>
            <p className="font-heading font-bold text-sm sm:text-base text-foreground">{totalSpent}</p>
          </div>
        </div>

        {/* Achats actifs avec expiration */}
        {activePurchases.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] sm:text-xs font-semibold text-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3 text-primary" /> Packs actifs
            </p>
            {activePurchases.slice(0, 2).map((p) => {
              const expiresIn = Math.ceil((new Date(p.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-medium capitalize truncate">{p.pack_code}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {p.tokens_remaining}/{p.tokens_purchased} restants
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[8px] sm:text-[9px]">
                    Expire dans {expiresIn}j
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {/* Historique récent */}
        {transactions.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border">
            <p className="text-[10px] sm:text-xs font-semibold text-foreground flex items-center gap-1">
              <History className="w-3 h-3 text-primary" /> Dernières opérations
            </p>
            {transactions.slice(0, 3).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-[10px] sm:text-[11px]">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{t.reason || t.type}</p>
                  <p className="text-[8px] text-muted-foreground">
                    {format(new Date(t.created_at), "d MMM yyyy", { locale: fr })}
                  </p>
                </div>
                <span className={`font-bold ${t.amount > 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {t.amount > 0 ? "+" : ""}{t.amount}
                </span>
              </div>
            ))}
          </div>
        )}

        {balance === 0 && activePurchases.length === 0 && (
          <Link to="/jetons" className="block">
            <Button variant="outline" className="w-full text-xs gap-1.5">
              Acheter votre premier pack <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
};

export default TokenWalletCard;
