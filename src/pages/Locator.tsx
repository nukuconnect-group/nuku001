import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useTokens } from "@/hooks/useTokens";
import { MapPin, Search, Coins, Loader2, Crown, Store, User } from "lucide-react";

const LOCATOR_COST = 2;

interface LocatorResult {
  id: string;
  title: string;
  subtitle?: string | null;
  location?: string | null;
  meta?: string | null;
  link?: string;
}

const Locator = () => {
  const { t, formatPrice } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile, isReady } = useProfile();
  const { balance, loading: tokensLoading, spendTokens } = useTokens();

  const isSeller = useMemo(() => {
    const type = profile?.user_type || "";
    return ["producer", "supplier", "producteur", "fournisseur"].includes(type);
  }, [profile?.user_type]);

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [radius, setRadius] = useState(50);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<LocatorResult[] | null>(null);

  useEffect(() => {
    if (isReady && !user) navigate("/auth?returnTo=/localiser", { replace: true });
  }, [isReady, user, navigate]);

  useEffect(() => {
    if (profile?.location && !region) setRegion(profile.location);
  }, [profile?.location, region]);

  const runSearch = async () => {
    if (!query.trim()) {
      toast({ title: t("loc.missingProduct"), variant: "destructive" });
      return;
    }
    if (balance < LOCATOR_COST) {
      toast({
        title: t("loc.insufficient"),
        description: t("loc.insufficientDesc"),
        variant: "destructive",
      });
      return;
    }

    setSearching(true);
    setResults(null);
    try {
      const spend = await spendTokens(
        LOCATOR_COST,
        isSeller ? "locator_buyers" : "locator_suppliers",
        undefined,
        "locator"
      );
      if (!spend?.success) {
        toast({
          title: t("loc.insufficient"),
          description: t("loc.insufficientDesc"),
          variant: "destructive",
        });
        setSearching(false);
        return;
      }

      let found: LocatorResult[] = [];

      if (isSeller) {
        // Un vendeur localise des acheteurs → demandes d'achat correspondantes
        let q = supabase
          .from("demands")
          .select("id, title, description, category, location, budget, quantity, unit, created_at")
          .eq("status", "open")
          .or(`title.ilike.%${query.trim()}%,category.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%`)
          .order("created_at", { ascending: false })
          .limit(30);
        if (region.trim()) q = q.ilike("location", `%${region.trim()}%`);
        const { data } = await q;
        found = (data || []).map((d: any) => ({
          id: d.id,
          title: d.title,
          subtitle: d.category,
          location: d.location,
          meta: d.budget ? formatPrice(Number(d.budget)) : null,
          link: "/marketplace?tab=demands",
        }));
      } else {
        // Un acheteur localise des fournisseurs → produits correspondants regroupés par vendeur
        let q = supabase
          .from("products")
          .select("id, name, category, location, price, unit, producer_id, profiles!products_producer_id_fkey(id, full_name, business_name, location, is_verified)")
          .or(`name.ilike.%${query.trim()}%,category.ilike.%${query.trim()}%`)
          .limit(60);
        if (region.trim()) q = q.ilike("location", `%${region.trim()}%`);
        const { data } = await q;
        const seen = new Set<string>();
        found = (data || [])
          .map((p: any) => {
            const prod = p.profiles;
            if (!prod || seen.has(prod.id)) return null;
            seen.add(prod.id);
            return {
              id: prod.id,
              title: prod.business_name || prod.full_name || "Fournisseur",
              subtitle: p.name,
              location: p.location || prod.location,
              meta: p.price ? `${formatPrice(Number(p.price))}/${p.unit || ""}` : null,
              link: `/boutique/${prod.id}`,
            } as LocatorResult;
          })
          .filter(Boolean) as LocatorResult[];
      }

      setResults(found);

      if (user) {
        await supabase.from("locator_searches").insert({
          user_id: user.id,
          search_type: isSeller ? "buyers" : "suppliers",
          product_query: query.trim(),
          region: region.trim() || null,
          radius_km: radius,
          results_count: found.length,
          tokens_spent: LOCATOR_COST,
        });
      }
    } catch (e) {
      console.error("[Locator] search failed", e);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const title = isSeller ? t("loc.titleSeller") : t("loc.titleBuyer");

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SEO title={`${title} | NukuConnect`} description={isSeller ? t("loc.subtitleSeller") : t("loc.subtitleBuyer")} />
      <Header />

      <main className="pt-4 sm:pt-8 pb-8 sm:pb-12">
        <div className="container mx-auto px-3 sm:px-4 max-w-3xl">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            <h1 className="font-heading text-lg sm:text-2xl font-bold text-foreground">{title}</h1>
            <Badge className="gap-1 text-[9px] ml-auto"><Crown className="w-3 h-3" /> Premium</Badge>
          </div>

          <Card className="mb-5">
            <CardHeader className="p-3 sm:p-5 pb-2">
              <CardDescription className="text-[11px] sm:text-xs">
                {isSeller ? t("loc.subtitleSeller") : t("loc.subtitleBuyer")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-5 pt-0 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("loc.product")}</Label>
                <Input
                  className="text-xs"
                  value={query}
                  placeholder={isSeller ? t("loc.productPlaceholderSeller") : t("loc.productPlaceholderBuyer")}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("loc.region")}</Label>
                  <Input className="text-xs" value={region} onChange={(e) => setRegion(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("loc.radius")}</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    className="text-xs"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 p-2.5">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Coins className="w-3.5 h-3.5 text-primary" />
                  {t("loc.cost").replace("{n}", String(LOCATOR_COST))}
                </div>
                <div className="text-[11px] font-semibold text-foreground">
                  {t("loc.balance")}: {tokensLoading ? "…" : balance}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">{t("loc.premium")}</p>

              <div className="flex gap-2">
                <Button onClick={runSearch} disabled={searching} className="flex-1 gap-2 text-xs h-9">
                  {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  {searching ? t("loc.searching") : t("loc.search")}
                </Button>
                <Link to="/jetons">
                  <Button variant="outline" className="gap-1.5 text-xs h-9">
                    <Coins className="w-3.5 h-3.5" /> {t("loc.buyCredits")}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {results && (
            <Card>
              <CardHeader className="p-3 sm:p-5 pb-2">
                <CardTitle className="text-sm">
                  {t("loc.results")} ({results.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-5 pt-0 space-y-2">
                {results.length === 0 && (
                  <p className="text-xs text-muted-foreground py-6 text-center">{t("loc.noResults")}</p>
                )}
                {results.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {isSeller ? <User className="w-4 h-4 text-primary" /> : <Store className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">{r.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {[r.subtitle, r.location, r.meta].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                    {r.link && (
                      <Link to={r.link}>
                        <Button size="sm" variant="outline" className="text-[10px] h-7">
                          {isSeller ? t("loc.contact") : t("loc.viewProfile")}
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
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

export default Locator;
