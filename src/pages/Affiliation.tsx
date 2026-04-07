import SEO from "@/components/SEO";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Copy, Users, TrendingUp, Wallet, Share2, Gift, ShieldCheck, ArrowRight, CheckCircle, Loader2, Link as LinkIcon } from "lucide-react";

const COMMISSION_RATES = {
  subscription: 0.10, // 10% on paid subscriptions
  purchase: 0.03, // 3% on purchases
};

const Affiliation = () => {
  const { profile, user } = useProfile();
  const { toast } = useToast();
  const { formatPrice } = useLanguage();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const referralLink = useMemo(() => {
    if (!referralCode) return "";
    return `${window.location.origin}/auth?ref=${referralCode}`;
  }, [referralCode]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    
    // Load referral code
    const { data: refs } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (refs && refs.length > 0) {
      setReferralCode(refs[0].referral_code);
      setReferrals(refs);
    }

    // Load earnings
    const { data: earningsData } = await supabase
      .from("referral_earnings")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    setEarnings(earningsData || []);
    setLoading(false);
  };

  const generateCode = async () => {
    if (!user) {
      toast({ title: "Connectez-vous", description: "Vous devez être connecté pour créer un code de parrainage." });
      return;
    }
    setGenerating(true);
    const code = `NUKU${user.id.slice(0, 6).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`;
    
    const { error } = await supabase
      .from("referrals")
      .insert({ referrer_id: user.id, referral_code: code });

    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer le code. Réessayez.", variant: "destructive" });
    } else {
      setReferralCode(code);
      toast({ title: "Code créé ! 🎉", description: "Partagez votre lien pour commencer à gagner." });
      loadData();
    }
    setGenerating(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Lien copié ! 📋", description: "Partagez-le avec vos contacts." });
  };

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Rejoignez NukuConnect",
        text: "Achetez et vendez des produits agricoles sur NukuConnect. Inscrivez-vous avec mon lien !",
        url: referralLink,
      });
    } else {
      copyLink();
    }
  };

  const totalEarned = earnings.reduce((s, e) => s + Number(e.amount), 0);
  const activeReferrals = referrals.filter(r => r.status === "active").length;

  return (
    <div className="min-h-screen pb-14 lg:pb-0">
      <SEO
        url="/affiliation"
        title="Programme d'Affiliation - NukuConnect"
        description="Gagnez de l'argent en parrainant des producteurs et acheteurs. 10% sur les abonnements payants, 3% sur les achats."
        image="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&h=630&fit=crop&q=80"
      />
      <Header />

      <main className="py-6 sm:py-10">
        <div className="container mx-auto px-3 sm:px-4 max-w-5xl">
          {/* Hero */}
          <div className="text-center mb-8 sm:mb-12">
            <Badge className="mb-3 bg-accent/10 text-accent border-accent/30">
              <Gift className="w-3 h-3 mr-1" /> Programme de Parrainage
            </Badge>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground mb-3">
              Parrainez & Gagnez
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Partagez NukuConnect avec vos contacts et gagnez des commissions sur chaque abonnement et achat réalisé par vos filleuls.
            </p>
          </div>

          {/* Commission rates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-5 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <p className="text-3xl font-extrabold text-primary mb-1">10%</p>
                <p className="text-sm font-semibold text-foreground">Sur les abonnements payants</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Gagnez 10% chaque fois qu'un filleul souscrit à un plan Pro ou Business
                </p>
              </CardContent>
            </Card>
            <Card className="border-accent/20 bg-accent/5">
              <CardContent className="p-5 text-center">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Wallet className="w-6 h-6 text-accent" />
                </div>
                <p className="text-3xl font-extrabold text-accent mb-1">3%</p>
                <p className="text-sm font-semibold text-foreground">Sur chaque achat</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Gagnez 3% sur chaque transaction réalisée par vos filleuls
                </p>
              </CardContent>
            </Card>
          </div>

          {/* How it works */}
          <Card className="mb-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">Comment ça marche ?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { step: "1", title: "Générez votre lien", desc: "Créez votre code de parrainage unique en un clic", icon: LinkIcon },
                  { step: "2", title: "Partagez", desc: "Envoyez votre lien à vos contacts (producteurs, acheteurs, fournisseurs)", icon: Share2 },
                  { step: "3", title: "Gagnez", desc: "Recevez des commissions automatiques sur leurs abonnements et achats", icon: Wallet },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                      {s.step}
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-semibold">{s.title}</h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* User section */}
          {user ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <Card>
                  <CardContent className="p-3 sm:p-4 text-center">
                    <Users className="w-5 h-5 mx-auto text-primary mb-1" />
                    <p className="text-lg sm:text-xl font-bold">{referrals.length}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Filleuls</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4 text-center">
                    <CheckCircle className="w-5 h-5 mx-auto text-primary mb-1" />
                    <p className="text-lg sm:text-xl font-bold">{activeReferrals}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Actifs</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4 text-center">
                    <Wallet className="w-5 h-5 mx-auto text-accent mb-1" />
                    <p className="text-lg sm:text-xl font-bold">{formatPrice(totalEarned)}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Gains totaux</p>
                  </CardContent>
                </Card>
              </div>

              {/* Referral link */}
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-primary" />
                    Votre lien de parrainage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {referralCode ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input value={referralLink} readOnly className="text-xs" />
                        <Button variant="outline" size="sm" onClick={copyLink} className="flex-shrink-0">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={shareLink} className="flex-1 gap-2">
                          <Share2 className="w-4 h-4" /> Partager mon lien
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center">
                        Code: <span className="font-mono font-bold text-foreground">{referralCode}</span>
                      </p>
                    </div>
                  ) : (
                    <Button onClick={generateCode} disabled={generating} className="w-full gap-2">
                      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                      Générer mon code de parrainage
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Earnings history */}
              {earnings.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base">Historique des gains</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border">
                      {earnings.slice(0, 20).map((e) => (
                        <div key={e.id} className="flex items-center justify-between py-2.5">
                          <div>
                            <p className="text-xs font-medium">
                              {e.source_type === "subscription" ? "📋 Abonnement" : "🛒 Achat"}
                            </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(e.created_at).toLocaleDateString("fr-FR")} · {(e.commission_rate * 100).toFixed(0)}% de {formatPrice(e.source_amount)}
                    </p>
                          </div>
                          <span className="text-sm font-bold text-primary">+{formatPrice(e.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <ShieldCheck className="w-10 h-10 mx-auto text-primary mb-3" />
                <h3 className="text-base font-bold mb-2">Connectez-vous pour commencer</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Créez un compte ou connectez-vous pour accéder à votre tableau de bord d'affiliation.
                </p>
                <Button asChild>
                  <a href="/auth">Se connecter <ArrowRight className="w-4 h-4 ml-1" /></a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Affiliation;
