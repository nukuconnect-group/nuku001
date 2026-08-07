import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Search, MessageSquare, MapPin, ShieldCheck, Truck, Send, Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthenticatedFunction } from "@/lib/edgeFunctions";
import { useToast } from "@/hooks/use-toast";

interface SourcingMatch {
  product_id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  available: number;
  min_order: number;
  location: string;
  organic: boolean;
  negotiable: boolean;
  delay_days: number | null;
  supplier_name: string;
  supplier_verified: boolean;
  slug: string | null;
  image: string | null;
  supplier_user_id: string | null;
  score: number;
  reason: string;
  estimated_total: number;
}

interface DemandOffer {
  id: string;
  supplier_user_id: string;
  unit_price: number;
  total_price: number;
  delivery_days: number | null;
  message: string | null;
  status: string;
  created_at: string;
}

const fcfa = (n: number) => `${Math.round(Number(n) || 0).toLocaleString("fr-FR")} FCFA`;

const Sourcing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [need, setNeed] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");
  const [deadline, setDeadline] = useState("");
  const [broadcast, setBroadcast] = useState(true);

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [matches, setMatches] = useState<SourcingMatch[]>([]);
  const [demandId, setDemandId] = useState<string | null>(null);
  const [offers, setOffers] = useState<DemandOffer[]>([]);

  const runSourcing = useCallback(async () => {
    if (need.trim().length < 3) {
      toast({ title: "Décrivez votre besoin", description: "Ex : 500 kg de maïs blanc livrés à Lomé sous 10 jours.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setMatches([]);
    setSummary("");
    try {
      const data = await invokeAuthenticatedFunction<any>("ai-sourcing", {
        need: need.trim(),
        category: category.trim() || null,
        quantity: quantity ? Number(quantity) : null,
        unit: unit.trim() || null,
        budget: budget ? Number(budget) : null,
        location: location.trim() || null,
        deadline: deadline || null,
        broadcast,
      });
      if (data?.error) {
        toast({ title: "Sourcing impossible", description: data.error, variant: "destructive" });
        return;
      }
      setSummary(data?.summary || "");
      setMatches(Array.isArray(data?.matches) ? data.matches : []);
      setDemandId(data?.demand_id || null);
      if (broadcast && data?.demand_id) {
        toast({ title: "Besoin diffusé", description: "Les fournisseurs pertinents ont été alertés." });
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Sourcing indisponible", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [need, category, quantity, unit, budget, location, deadline, broadcast, toast]);

  // Live comparison of the offers received on the broadcast demand.
  useEffect(() => {
    if (!demandId) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("demand_offers" as any)
        .select("*")
        .eq("demand_id", demandId)
        .order("total_price", { ascending: true });
      if (active) setOffers(((data as any[]) || []) as DemandOffer[]);
    };
    load();
    const channel = supabase
      .channel(`demand-offers-${demandId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "demand_offers", filter: `demand_id=eq.${demandId}` }, load)
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [demandId]);

  const decide = async (offerId: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("demand_offers" as any).update({ status }).eq("id", offerId);
    if (error) {
      toast({ title: "Action impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "accepted" ? "Offre acceptée" : "Offre refusée" });
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SEO
        url="/sourcing"
        title="Sourcing automatique IA — Trouvez vos fournisseurs agricoles"
        description="Décrivez votre besoin : l'IA NukuConnect identifie les meilleurs fournisseurs, diffuse votre demande et compare automatiquement les offres reçues."
      />
      <Header />

      <main className="container mx-auto px-4 py-6 sm:py-10 max-w-5xl space-y-6">
        <header className="space-y-2">
          <Badge className="gap-1 bg-primary/10 text-primary border-0">
            <Sparkles className="w-3 h-3" /> Sourcing auto pro
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Sourcing automatique avec l'IA</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Exprimez votre besoin une seule fois. L'IA analyse le catalogue, classe les meilleures offres,
            diffuse votre demande aux fournisseurs pertinents et compare les propositions reçues.
          </p>
        </header>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" /> Votre besoin
            </CardTitle>
            <CardDescription className="text-xs">Plus votre description est précise, meilleur est le matching.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="need" className="text-xs">Description du besoin</Label>
              <Textarea
                id="need"
                value={need}
                onChange={(e) => setNeed(e.target.value)}
                placeholder="Ex : 500 kg de maïs blanc de qualité export, livrés à Lomé sous 10 jours, budget 200 000 FCFA."
                rows={3}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs">Catégorie</Label>
                <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Céréales" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quantity" className="text-xs">Quantité</Label>
                <Input id="quantity" type="number" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="500" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit" className="text-xs">Unité</Label>
                <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="budget" className="text-xs">Budget (FCFA)</Label>
                <Input id="budget" type="number" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="200000" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-xs">Zone de livraison</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lomé, Togo" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deadline" className="text-xs">Délai souhaité</Label>
                <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
              <div className="pr-3">
                <p className="text-xs font-semibold text-foreground">Diffuser aux fournisseurs</p>
                <p className="text-[11px] text-muted-foreground">Publie automatiquement votre besoin et alerte les fournisseurs les plus pertinents.</p>
              </div>
              <Switch checked={broadcast} onCheckedChange={setBroadcast} />
            </div>

            <Button variant="hero" className="w-full gap-2" onClick={runSourcing} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Analyse en cours…" : "Lancer le sourcing IA"}
            </Button>
          </CardContent>
        </Card>

        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
        )}

        {!loading && summary && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex gap-3">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{summary}</p>
            </CardContent>
          </Card>
        )}

        {!loading && matches.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Fournisseurs recommandés ({matches.length})</h2>
            {matches.map((m, index) => (
              <Card key={m.product_id} className="overflow-hidden">
                <CardContent className="p-3 sm:p-4 flex gap-3">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 overflow-hidden bg-muted">
                    {m.image ? (
                      <img src={m.image} alt={`${m.name} — ${m.supplier_name}`} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground" /></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="text-[10px]">#{index + 1}</Badge>
                      <p className="font-semibold text-sm text-foreground truncate flex-1">{m.name}</p>
                      <Badge className="text-[10px] bg-primary/15 text-primary border-0">{m.score}%</Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        {m.supplier_name}
                        {m.supplier_verified && <ShieldCheck className="w-3 h-3 text-primary" />}
                      </span>
                      {m.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.location}</span>}
                      {m.delay_days != null && <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{m.delay_days} j</span>}
                      {m.organic && <Badge variant="outline" className="text-[9px]">BIO</Badge>}
                      {m.negotiable && <Badge variant="outline" className="text-[9px]">Négociable</Badge>}
                    </div>

                    {m.reason && <p className="text-[11px] text-muted-foreground line-clamp-2">{m.reason}</p>}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="text-xs">
                        <span className="font-bold text-foreground">{fcfa(m.price)}</span>
                        <span className="text-muted-foreground"> / {m.unit}</span>
                        <span className="text-muted-foreground"> · estimé {fcfa(m.estimated_total)}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => navigate(`/produit/${m.slug || m.product_id}`)}>
                          Voir
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => navigate(`/messages?product=${m.product_id}&seller=${encodeURIComponent(m.supplier_name)}`)}
                        >
                          <MessageSquare className="w-3 h-3" /> Contacter
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {demandId && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" /> Offres reçues ({offers.length})
            </h2>
            {offers.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">
                Votre besoin a été diffusé. Les offres des fournisseurs apparaîtront ici en temps réel.
              </CardContent></Card>
            ) : (
              offers.map((o) => (
                <Card key={o.id}>
                  <CardContent className="p-3 sm:p-4 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{fcfa(o.total_price)} <span className="text-xs font-normal text-muted-foreground">({fcfa(o.unit_price)} / unité)</span></p>
                      {o.delivery_days != null && <p className="text-[11px] text-muted-foreground">Livraison sous {o.delivery_days} jour(s)</p>}
                      {o.message && <p className="text-[11px] text-muted-foreground line-clamp-2">{o.message}</p>}
                    </div>
                    <Badge variant={o.status === "accepted" ? "default" : o.status === "rejected" ? "destructive" : "outline"} className="text-[10px]">
                      {o.status}
                    </Badge>
                    {o.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" className="h-8 text-xs" onClick={() => decide(o.id, "accepted")}>Accepter</Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => decide(o.id, "rejected")}>Refuser</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </section>
        )}
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Sourcing;
