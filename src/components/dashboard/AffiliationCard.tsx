import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Copy, ArrowRight, Share2, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatAmount } from "@/lib/formatNumber";

interface Props {
  userId?: string;
}

export default function AffiliationCard({ userId }: Props) {
  const { toast } = useToast();
  const [code, setCode] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [subEarnings, setSubEarnings] = useState(0);
  const [purchaseEarnings, setPurchaseEarnings] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data: refs } = await supabase
        .from("referrals")
        .select("id, referral_code, status, referred_user_id")
        .eq("referrer_id", userId);
      if (refs && refs.length > 0) {
        setCode(refs[0].referral_code);
        setCount(refs.filter(r => r.status === "active" && r.referred_user_id).length);
      }
      const { data: earnings } = await supabase
        .from("referral_earnings")
        .select("amount, source_type")
        .eq("referrer_id", userId);
      if (earnings) {
        let total = 0, sub = 0, pur = 0;
        for (const e of earnings) {
          const v = Number(e.amount) || 0;
          total += v;
          if (e.source_type === "subscription") sub += v;
          else if (e.source_type === "purchase") pur += v;
        }
        setTotalEarnings(total);
        setSubEarnings(sub);
        setPurchaseEarnings(pur);
      }
    };
    load();
  }, [userId]);

  const referralLink = code ? `${window.location.origin}/auth?ref=${code}` : "";

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Lien copié !" });
  };

  const shareLink = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Rejoignez Nukuconnect",
          text: "Je t'invite sur Nukuconnect, la marketplace agricole intelligente d'Afrique 🌱",
          url: referralLink,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  if (!userId) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="p-3 sm:p-4 pb-1">
        <CardTitle className="text-sm flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          Mes gains de parrainage
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-2 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-primary/5 rounded-lg p-2 text-center">
            <p className="text-base font-bold text-primary">{count}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">Filleuls actifs</p>
          </div>
          <div className="bg-accent/10 rounded-lg p-2 text-center">
            <p className="text-base font-bold text-accent-foreground">{formatAmount(subEarnings)} F</p>
            <p className="text-[9px] text-muted-foreground leading-tight">10% abonnements</p>
          </div>
          <div className="bg-accent/10 rounded-lg p-2 text-center">
            <p className="text-base font-bold text-accent-foreground">{formatAmount(purchaseEarnings)} F</p>
            <p className="text-[9px] text-muted-foreground leading-tight">2% achats</p>
          </div>
        </div>
        <div className="bg-muted/40 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Total gagné</p>
          <p className="text-lg font-extrabold text-primary">{formatAmount(totalEarnings)} F</p>
        </div>
        {code ? (
          <>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 bg-muted rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground truncate font-mono">
                {referralLink}
              </div>
              <Button size="sm" variant="outline" className="h-7 w-7 p-0 flex-shrink-0" onClick={copyLink} aria-label="Copier le lien">
                <Copy className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="outline" className="h-7 w-7 p-0 flex-shrink-0" onClick={shareLink} aria-label="Partager le lien">
                <Share2 className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-[9px] text-center text-muted-foreground">
              Code : <span className="font-mono font-bold text-foreground">{code}</span>
            </p>
          </>
        ) : (
          <Link to="/affiliation" className="block">
            <Button size="sm" className="w-full gap-1.5 text-xs h-8">
              <Users className="w-3 h-3" /> Activer mon code de parrainage
            </Button>
          </Link>
        )}
        <Link to="/affiliation/statut">
          <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs h-7">
            Voir le statut détaillé <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
