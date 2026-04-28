import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, Clock, CheckCircle2, TrendingUp, Gift, ShoppingBag, CreditCard } from "lucide-react";
import { formatAmount } from "@/lib/formatNumber";

type Earning = {
  id: string;
  amount: number;
  commission_rate: number;
  source_type: string;
  source_amount: number | null;
  description: string | null;
  created_at: string;
};

type Period = "7d" | "30d" | "all";

const periodSinceISO = (p: Period): string | null => {
  if (p === "all") return null;
  const days = p === "7d" ? 7 : 30;
  return new Date(Date.now() - days * 86_400_000).toISOString();
};

export default function AffiliationStatus() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralsCount, setReferralsCount] = useState(0);
  const [pendingReferrals, setPendingReferrals] = useState(0);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [period, setPeriod] = useState<Period>("30d");

  useEffect(() => {
    const load = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setLoading(false);
        return;
      }
      setUserId(u.user.id);

      const { data: refs } = await supabase
        .from("referrals")
        .select("id, referral_code, status, referred_user_id")
        .eq("referrer_id", u.user.id);
      if (refs && refs.length > 0) {
        setReferralCode(refs[0].referral_code);
        setReferralsCount(refs.filter(r => r.status === "active" && r.referred_user_id).length);
        setPendingReferrals(refs.filter(r => !r.referred_user_id).length);
      }

      const { data: er } = await supabase
        .from("referral_earnings")
        .select("id, amount, commission_rate, source_type, source_amount, description, created_at")
        .eq("referrer_id", u.user.id)
        .order("created_at", { ascending: false });
      if (er) setEarnings(er as Earning[]);

      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const since = periodSinceISO(period);
    if (!since) return earnings;
    return earnings.filter(e => e.created_at >= since);
  }, [earnings, period]);

  const stats = useMemo(() => {
    let validated = 0, sub = 0, purchase = 0;
    for (const e of filtered) {
      const v = Number(e.amount) || 0;
      validated += v;
      if (e.source_type === "subscription") sub += v;
      else if (e.source_type === "purchase") purchase += v;
    }
    // Pending = none today (earnings auto-validated via triggers); placeholder for future moderation
    return { validated, sub, purchase, pending: 0 };
  }, [filtered]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Connectez-vous pour voir votre statut de parrainage.</p>
            <Link to="/auth"><Button>Se connecter</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Statut de parrainage | Nukuconnect"
        description="Suivez vos filleuls, vos gains validés et en attente, ainsi que le récapitulatif par période."
        url="/affiliation/statut"
      />
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-5xl mx-auto p-4 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Link to="/affiliation">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                Statut de parrainage
              </h1>
              <p className="text-xs text-muted-foreground">
                {referralCode ? <>Votre code : <span className="font-mono font-semibold text-foreground">{referralCode}</span></> : "Pas encore de code"}
              </p>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Users className="w-3.5 h-3.5" /> Filleuls actifs
                </div>
                <p className="text-2xl font-bold text-foreground">{referralsCount}</p>
                {pendingReferrals > 0 && (
                  <p className="text-[10px] text-muted-foreground">+ {pendingReferrals} en attente</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Gains validés
                </div>
                <p className="text-2xl font-bold text-primary">{formatAmount(stats.validated)} F</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Clock className="w-3.5 h-3.5" /> En attente
                </div>
                <p className="text-2xl font-bold text-foreground">{formatAmount(stats.pending)} F</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <TrendingUp className="w-3.5 h-3.5" /> Total période
                </div>
                <p className="text-2xl font-bold text-foreground">{formatAmount(stats.sub + stats.purchase)} F</p>
                <p className="text-[10px] text-muted-foreground">
                  10% : {formatAmount(stats.sub)} · 2% : {formatAmount(stats.purchase)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Period tabs */}
          <Tabs value={period} onValueChange={v => setPeriod(v as Period)}>
            <TabsList className="grid grid-cols-3 w-full max-w-xs">
              <TabsTrigger value="7d">7 jours</TabsTrigger>
              <TabsTrigger value="30d">30 jours</TabsTrigger>
              <TabsTrigger value="all">Tout</TabsTrigger>
            </TabsList>
            <TabsContent value={period} className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Journal détaillé des gains</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {filtered.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      Aucun gain sur cette période. Partagez votre lien pour commencer !
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {filtered.map(e => {
                        const isSub = e.source_type === "subscription";
                        const Icon = isSub ? CreditCard : ShoppingBag;
                        const label = isSub ? "Abonnement" : "Commande";
                        const rate = Math.round((Number(e.commission_rate) || 0) * 100);
                        return (
                          <li key={e.id} className="p-3 sm:p-4 flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isSub ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent-foreground"}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold">{label}</span>
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{rate}%</Badge>
                                <Badge className="text-[10px] py-0 px-1.5 bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/15">
                                  Validé
                                </Badge>
                              </div>
                              {e.description && (
                                <p className="text-[11px] text-muted-foreground truncate">{e.description}</p>
                              )}
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(e.created_at).toLocaleString("fr-FR", {
                                  day: "2-digit", month: "short", year: "numeric",
                                  hour: "2-digit", minute: "2-digit",
                                })}
                                {e.source_amount ? <> · base {formatAmount(Number(e.source_amount))} F</> : null}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-primary">+{formatAmount(Number(e.amount))} F</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <p className="text-[11px] text-muted-foreground text-center">
            Les commissions sont créditées automatiquement : <strong>10%</strong> sur chaque abonnement payant et <strong>2%</strong> sur chaque commande payée de vos filleuls.
          </p>
        </div>
      </div>
    </>
  );
}
