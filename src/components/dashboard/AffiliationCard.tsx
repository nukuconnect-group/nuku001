import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Wallet, Copy, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  userId?: string;
}

export default function AffiliationCard({ userId }: Props) {
  const { toast } = useToast();
  const [code, setCode] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data: refs } = await supabase
        .from("referrals")
        .select("id, referral_code, status, referred_user_id")
        .eq("referrer_id", userId);
      if (refs && refs.length > 0) {
        setCode(refs[0].referral_code);
        // Only count referrals where someone actually signed up
        setCount(refs.filter(r => r.status === "active" && r.referred_user_id).length);
      }
      const { data: earnings } = await supabase
        .from("referral_earnings")
        .select("amount")
        .eq("referrer_id", userId);
      if (earnings) {
        setTotalEarnings(earnings.reduce((s, e) => s + (Number(e.amount) || 0), 0));
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

  if (!userId) return null;

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 pb-1">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Programme d'affiliation
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-2 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-primary/5 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-primary">{count}</p>
            <p className="text-[9px] text-muted-foreground">Filleuls actifs</p>
          </div>
          <div className="bg-accent/10 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-accent-foreground">{totalEarnings.toLocaleString("fr-FR")} F</p>
            <p className="text-[9px] text-muted-foreground">Gains totaux</p>
          </div>
        </div>
        {code && (
          <div className="flex items-center gap-1.5">
            <div className="flex-1 bg-muted rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground truncate font-mono">
              {referralLink}
            </div>
            <Button size="sm" variant="outline" className="h-7 w-7 p-0 flex-shrink-0" onClick={copyLink}>
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        )}
        <Link to="/affiliation">
          <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-8">
            Gérer mon affiliation <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
