import SEO from "@/components/SEO";
import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  QrCode, Search, MapPin, Calendar, Leaf, Truck,
  CheckCircle2, Clock, Package, Shield, Camera, FileText,
  Scan, ArrowRight, Star, Crown, Zap, Lock, Loader2,
  Factory, Store, Eye, Sprout, Warehouse, ShoppingCart, MessageCircle,
  Plus, Rocket, History, Trash2
} from "lucide-react";
import QRScanner from "@/components/QRScanner";

// ===== Traceability timeline stages =====
interface TraceStage {
  id: string;
  label: string;
  icon: any;
  description: string;
}

const TRACE_STAGES: TraceStage[] = [
  { id: "semis", label: "Semis / Plantation", icon: Sprout, description: "Graines plantées, début du cycle de culture" },
  { id: "croissance", label: "Croissance", icon: Leaf, description: "Phase de développement et entretien de la culture" },
  { id: "recolte", label: "Récolte", icon: Factory, description: "Cueillette ou moisson du produit" },
  { id: "controle", label: "Contrôle qualité", icon: Shield, description: "Vérification de la qualité et conformité" },
  { id: "conditionnement", label: "Conditionnement", icon: Package, description: "Emballage et préparation pour le transport" },
  { id: "stockage", label: "Stockage", icon: Warehouse, description: "Entreposage dans des conditions optimales" },
  { id: "expedition", label: "Expédition", icon: Truck, description: "Transport vers le point de vente ou l'acheteur" },
  { id: "vente", label: "Mise en vente", icon: Store, description: "Disponible sur la marketplace" },
  { id: "livre", label: "Livré au client", icon: ShoppingCart, description: "Produit remis à l'acheteur final" },
];

const Traceability = () => {
  const navigate = useNavigate();
  const { formatPrice } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile, isReady } = useProfile();
  const { subscription, hasActiveSubscription } = useSubscription();
  const [searchParams] = useSearchParams();
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [activeTab, setActiveTab] = useState("trace");
  const SCAN_HISTORY_KEY = "nukuconnect-trace-history";
  const [scanHistory, setScanHistory] = useState<Array<{ id: string; batch_number: string | null; product_name: string | null; product_image: string | null; scanned_at: string }>>(() => {
    try {
      const raw = localStorage.getItem(SCAN_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const persistHistory = (next: typeof scanHistory) => {
    setScanHistory(next);
    try { localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(next.slice(0, 50))); } catch {}
  };

  const recordScan = (record: any) => {
    if (!record?.id) return;
    const entry = {
      id: record.id,
      batch_number: record.batch_number || null,
      product_name: record.products?.name || null,
      product_image: record.products?.images?.[0] || null,
      scanned_at: new Date().toISOString(),
    };
    const filtered = scanHistory.filter(h => h.id !== entry.id);
    persistHistory([entry, ...filtered]);
  };

  // New traceability form state
  const [newTrace, setNewTrace] = useState({
    productId: "",
    batchNumber: "",
    origin: "",
    weight: "",
    temperature: "",
    humidity: "",
    certifications: "",
  });
  const [newEventForm, setNewEventForm] = useState({
    traceabilityId: "",
    stageIndex: 0,
    description: "",
    location: "",
  });

  const isPaidPlan = subscription && subscription.plan !== "free" && hasActiveSubscription;

  // Fetch user's products (for producers)
  const { data: userProducts = [] } = useQuery({
    queryKey: ["my-products-trace", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from("products")
        .select("id, name, images, category, is_organic")
        .eq("producer_id", profile.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch user's traceability records
  const { data: myTraceRecords = [] } = useQuery({
    queryKey: ["my-traceability", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from("product_traceability" as any)
        .select("*, products(name, images)")
        .eq("producer_id", profile.id)
        .order("created_at", { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch events for a traceability record
  const { data: traceEvents = [] } = useQuery({
    queryKey: ["trace-events", searchResult?.id],
    queryFn: async () => {
      if (!searchResult?.id) return [];
      const { data } = await supabase
        .from("traceability_events" as any)
        .select("*")
        .eq("traceability_id", searchResult.id)
        .order("event_date", { ascending: true });
      return (data as any[]) || [];
    },
    enabled: !!searchResult?.id,
  });

  // Search by batch number or traceability ID
  const handleSearch = async () => {
    if (!searchCode.trim()) return;
    const code = searchCode.trim();

    // Search by batch_number or id
    const { data } = await supabase
      .from("product_traceability" as any)
      .select("*, products(name, images, is_organic, category, location)")
      .or(`batch_number.ilike.%${code}%,id.eq.${code.length === 36 ? code : '00000000-0000-0000-0000-000000000000'}`)
      .limit(1)
      .maybeSingle();

    if (data) {
      setSearchResult(data);
      setActiveTab("trace");
    } else {
      setSearchResult(null);
      toast({ title: "Produit introuvable", description: "Vérifiez le code de traçabilité et réessayez.", variant: "destructive" });
    }
  };

  // Create traceability record
  const createTraceMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !newTrace.productId) throw new Error("Missing data");
      const certs = newTrace.certifications.split(",").map(c => c.trim()).filter(Boolean);
      const { data, error } = await supabase
        .from("product_traceability" as any)
        .insert({
          product_id: newTrace.productId,
          producer_id: profile.id,
          batch_number: newTrace.batchNumber || `LOT-${Date.now().toString(36).toUpperCase()}`,
          origin: newTrace.origin,
          weight: newTrace.weight,
          temperature: newTrace.temperature,
          humidity: newTrace.humidity,
          is_organic: userProducts.find(p => p.id === newTrace.productId)?.is_organic || false,
          certifications: certs,
          current_stage: 0,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Traçabilité créée ✓", description: "Vous pouvez maintenant ajouter des étapes." });
      setNewTrace({ productId: "", batchNumber: "", origin: "", weight: "", temperature: "", humidity: "", certifications: "" });
      queryClient.invalidateQueries({ queryKey: ["my-traceability"] });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  // Add traceability event
  const addEventMutation = useMutation({
    mutationFn: async () => {
      if (!newEventForm.traceabilityId) throw new Error("Missing traceability ID");
      const stage = TRACE_STAGES[newEventForm.stageIndex];
      const { error } = await supabase
        .from("traceability_events" as any)
        .insert({
          traceability_id: newEventForm.traceabilityId,
          stage_index: newEventForm.stageIndex,
          stage_label: stage.label,
          event_description: newEventForm.description,
          location: newEventForm.location,
          event_date: new Date().toISOString().split("T")[0],
        });
      if (error) throw error;

      // Update current_stage on the traceability record
      await supabase
        .from("product_traceability" as any)
        .update({ current_stage: newEventForm.stageIndex, status: newEventForm.stageIndex >= 7 ? "verified" : "in-progress" })
        .eq("id", newEventForm.traceabilityId);
    },
    onSuccess: () => {
      toast({ title: "Étape ajoutée ✓" });
      setNewEventForm({ traceabilityId: "", stageIndex: 0, description: "", location: "" });
      queryClient.invalidateQueries({ queryKey: ["my-traceability"] });
      queryClient.invalidateQueries({ queryKey: ["trace-events"] });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-primary text-primary-foreground gap-1"><CheckCircle2 className="w-3 h-3" /> Vérifié</Badge>;
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> En attente</Badge>;
      case "in-progress":
      case "in-transit":
        return <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600"><Truck className="w-3 h-3" /> En cours</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> {status}</Badge>;
    }
  };

  // Paywall component
  const PaywallCTA = () => (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardContent className="p-6 text-center">
        <Lock className="w-10 h-10 text-primary/40 mx-auto mb-3" />
        <h3 className="font-heading font-bold text-lg mb-2">Fonctionnalité réservée aux plans payants</h3>
        <p className="text-sm text-muted-foreground mb-4">
          La gestion de la traçabilité de vos produits est disponible avec les plans Pro, Business et Entreprise.
        </p>
        <Link to="/plans">
          <Button variant="hero" className="gap-2">
            <Rocket className="w-4 h-4" />Passer à un plan payant
          </Button>
        </Link>
        <p className="text-xs text-muted-foreground mt-3">
          Plan actuel : <span className="font-semibold capitalize">{subscription?.plan || "Gratuit"}</span>
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SEO url="/tracabilite" title="Traçabilité des Produits" description="Vérifiez l'origine et le parcours de vos produits agricoles." />
      <Header />

      {/* Hero */}
      <section className="pt-20 pb-8 bg-gradient-earth relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_70%)]" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4 gap-1">
              <QrCode className="w-3 h-3" />Traçabilité NUKUCONNECT
            </Badge>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">
              De la ferme à votre table
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-xl mx-auto">
              Suivez le parcours complet de chaque produit. Transparence totale.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
              <div className="relative flex-1">
                <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="N° lot ou code (ex: LOT-XXXX)"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-11 h-11 text-sm"
                />
              </div>
              <Button variant="outline" size="lg" onClick={() => setShowScanner(true)} className="gap-2 h-11">
                <Scan className="w-4 h-4" />Scanner
              </Button>
              <Button variant="hero" size="lg" onClick={handleSearch} className="gap-2 h-11">
                <Search className="w-4 h-4" />Rechercher
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Tabs */}
      <section className="py-6">
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-5xl mx-auto">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="trace" className="text-xs sm:text-sm py-2">
                <Eye className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Tracer
              </TabsTrigger>
              <TabsTrigger value="manage" className="text-xs sm:text-sm py-2">
                <Package className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Gérer
              </TabsTrigger>
              <TabsTrigger value="pricing" className="text-xs sm:text-sm py-2">
                <Crown className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Tarifs
              </TabsTrigger>
            </TabsList>

            {/* TAB: Trace result (PUBLIC) */}
            <TabsContent value="trace" className="mt-6">
              {searchResult ? (
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      {(searchResult as any).products?.images?.[0] && (
                        <img src={(searchResult as any).products.images[0]} alt="" className="w-20 h-20 rounded-xl object-cover" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-lg">{(searchResult as any).products?.name || "Produit"}</CardTitle>
                            <p className="text-sm text-muted-foreground">Lot: {searchResult.batch_number}</p>
                            {searchResult.origin && <p className="text-xs text-muted-foreground">Origine: {searchResult.origin}</p>}
                          </div>
                          {getStatusBadge(searchResult.status)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Info Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {searchResult.origin && (
                        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                          <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <div><p className="text-[10px] text-muted-foreground">Origine</p><p className="text-sm font-medium">{searchResult.origin}</p></div>
                        </div>
                      )}
                      {searchResult.harvest_date && (
                        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                          <Calendar className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <div><p className="text-[10px] text-muted-foreground">Récolte</p><p className="text-sm font-medium">{new Date(searchResult.harvest_date).toLocaleDateString("fr-FR")}</p></div>
                        </div>
                      )}
                      {searchResult.weight && (
                        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                          <Package className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <div><p className="text-[10px] text-muted-foreground">Poids</p><p className="text-sm font-medium">{searchResult.weight}</p></div>
                        </div>
                      )}
                      <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                        <Leaf className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <div><p className="text-[10px] text-muted-foreground">Culture</p><p className="text-sm font-medium">{searchResult.is_organic ? "Biologique 🌿" : "Conventionnel"}</p></div>
                      </div>
                    </div>

                    {/* Certifications */}
                    {searchResult.certifications?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Certifications</h4>
                        <div className="flex flex-wrap gap-2">
                          {searchResult.certifications.map((cert: string, i: number) => (
                            <Badge key={i} variant="secondary" className="gap-1 text-xs"><CheckCircle2 className="w-3 h-3 text-primary" />{cert}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stage progress bar */}
                    <div>
                      <h4 className="font-medium text-sm mb-3">Parcours du produit</h4>
                      <div className="mb-6 overflow-x-auto pb-2">
                        <div className="flex items-center min-w-[600px]">
                          {TRACE_STAGES.map((stage, i) => {
                            const StageIcon = stage.icon;
                            const isCompleted = i <= (searchResult.current_stage || 0);
                            const isCurrent = i === (searchResult.current_stage || 0);
                            return (
                              <div key={stage.id} className="flex items-center flex-1">
                                <div className="flex flex-col items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCurrent ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                    <StageIcon className="w-3.5 h-3.5" />
                                  </div>
                                  <p className={`text-[9px] mt-1 text-center max-w-[60px] leading-tight ${isCompleted ? "text-primary font-medium" : "text-muted-foreground"}`}>{stage.label}</p>
                                </div>
                                {i < TRACE_STAGES.length - 1 && (
                                  <div className={`h-0.5 flex-1 mx-1 ${i < (searchResult.current_stage || 0) ? "bg-primary" : "bg-border"}`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Timeline events from DB */}
                      {traceEvents.length > 0 && (
                        <div className="relative">
                          {traceEvents.map((event: any, i: number) => {
                            const stage = TRACE_STAGES[event.stage_index] || TRACE_STAGES[0];
                            const StageIcon = stage.icon;
                            return (
                              <div key={i} className="flex gap-3 pb-4 last:pb-0">
                                <div className="relative flex flex-col items-center">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <StageIcon className="w-3.5 h-3.5 text-primary" />
                                  </div>
                                  {i < traceEvents.length - 1 && <div className="w-0.5 flex-1 bg-primary/20 mt-1" />}
                                </div>
                                <div className="flex-1 pb-2">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-xs text-muted-foreground font-mono">{new Date(event.event_date).toLocaleDateString("fr-FR")}</p>
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">{event.stage_label}</Badge>
                                  </div>
                                  <p className="text-sm font-medium text-foreground">{event.event_description}</p>
                                  {event.location && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {traceEvents.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Aucune étape enregistrée pour ce produit.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <QrCode className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-heading font-bold text-lg mb-2">Recherchez un produit</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Entrez un numéro de lot ou scannez un QR code pour voir le parcours complet d'un produit.
                    </p>
                    <Button variant="outline" onClick={() => setShowScanner(true)} className="gap-2">
                      <Camera className="w-4 h-4" />Scanner QR
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TAB: Manage (GATED to paid plans) */}
            <TabsContent value="manage" className="mt-6">
              {!user ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Lock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <h3 className="font-heading font-bold text-lg mb-2">Connectez-vous</h3>
                    <p className="text-sm text-muted-foreground mb-4">Connectez-vous pour gérer la traçabilité de vos produits.</p>
                    <Link to="/auth"><Button variant="hero">Se connecter</Button></Link>
                  </CardContent>
                </Card>
              ) : !isPaidPlan ? (
                <PaywallCTA />
              ) : (
                <div className="space-y-6">
                  {/* Create new traceability record */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-primary" />Créer un enregistrement de traçabilité</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium mb-1 block">Produit *</label>
                          <Select value={newTrace.productId} onValueChange={(v) => setNewTrace({ ...newTrace, productId: v })}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Choisir un produit" /></SelectTrigger>
                            <SelectContent>
                              {userProducts.map((p: any) => (
                                <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">N° de lot</label>
                          <Input placeholder="Auto-généré si vide" value={newTrace.batchNumber} onChange={(e) => setNewTrace({ ...newTrace, batchNumber: e.target.value })} className="h-9 text-xs" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs font-medium mb-1 block">Origine</label>
                          <Input placeholder="Ex: Kara, Togo" value={newTrace.origin} onChange={(e) => setNewTrace({ ...newTrace, origin: e.target.value })} className="h-9 text-xs" />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Poids</label>
                          <Input placeholder="Ex: 500 kg" value={newTrace.weight} onChange={(e) => setNewTrace({ ...newTrace, weight: e.target.value })} className="h-9 text-xs" />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Température</label>
                          <Input placeholder="Ex: 22°C" value={newTrace.temperature} onChange={(e) => setNewTrace({ ...newTrace, temperature: e.target.value })} className="h-9 text-xs" />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Humidité</label>
                          <Input placeholder="Ex: 45%" value={newTrace.humidity} onChange={(e) => setNewTrace({ ...newTrace, humidity: e.target.value })} className="h-9 text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Certifications (séparées par virgule)</label>
                        <Input placeholder="Bio Certifié, Sans OGM..." value={newTrace.certifications} onChange={(e) => setNewTrace({ ...newTrace, certifications: e.target.value })} className="h-9 text-xs" />
                      </div>
                      <Button variant="hero" size="sm" className="gap-1" disabled={!newTrace.productId || createTraceMutation.isPending} onClick={() => createTraceMutation.mutate()}>
                        {createTraceMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        Créer
                      </Button>
                    </CardContent>
                  </Card>

                  {/* My traceability records */}
                  <div>
                    <h3 className="font-heading text-sm font-bold mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />Mes enregistrements ({myTraceRecords.length})
                    </h3>
                    {myTraceRecords.length === 0 ? (
                      <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Aucun enregistrement de traçabilité. Créez-en un ci-dessus.</CardContent></Card>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {myTraceRecords.map((record: any) => (
                          <Card key={record.id} className="hover:shadow-elevated transition-all">
                            <CardContent className="p-3">
                              <div className="flex gap-3">
                                {record.products?.images?.[0] && (
                                  <img src={record.products.images[0]} alt="" className="w-14 h-14 rounded-lg object-cover" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-1 mb-1">
                                    <h4 className="text-xs font-semibold truncate">{record.products?.name || "Produit"}</h4>
                                    {getStatusBadge(record.status)}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground font-mono">{record.batch_number}</p>
                                  {record.origin && <p className="text-[10px] text-muted-foreground">{record.origin}</p>}
                                  {/* Mini progress */}
                                  <div className="flex gap-0.5 mt-2">
                                    {TRACE_STAGES.map((_, i) => (
                                      <div key={i} className={`h-1 flex-1 rounded-full ${i <= (record.current_stage || 0) ? "bg-primary" : "bg-muted"}`} />
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Add event form inline */}
                              <div className="mt-3 pt-3 border-t border-border space-y-2">
                                <p className="text-[10px] font-semibold text-foreground">Ajouter une étape :</p>
                                <Select value={String(newEventForm.traceabilityId === record.id ? newEventForm.stageIndex : 0)} onValueChange={(v) => setNewEventForm({ ...newEventForm, traceabilityId: record.id, stageIndex: Number(v) })}>
                                  <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder="Étape" /></SelectTrigger>
                                  <SelectContent>
                                    {TRACE_STAGES.map((s, i) => (
                                      <SelectItem key={i} value={String(i)} className="text-[10px]">{s.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input placeholder="Description de l'événement" className="h-7 text-[10px]" value={newEventForm.traceabilityId === record.id ? newEventForm.description : ""} onChange={(e) => setNewEventForm({ ...newEventForm, traceabilityId: record.id, description: e.target.value })} />
                                <Input placeholder="Lieu" className="h-7 text-[10px]" value={newEventForm.traceabilityId === record.id ? newEventForm.location : ""} onChange={(e) => setNewEventForm({ ...newEventForm, traceabilityId: record.id, location: e.target.value })} />
                                <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" disabled={newEventForm.traceabilityId !== record.id || !newEventForm.description || addEventMutation.isPending} onClick={() => addEventMutation.mutate()}>
                                  {addEventMutation.isPending ? <Loader2 className="w-2 h-2 animate-spin" /> : <Plus className="w-2 h-2" />}Ajouter
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB: Pricing */}
            <TabsContent value="pricing" className="mt-6">
              <div className="text-center mb-6">
                <h2 className="font-heading text-xl sm:text-2xl font-bold mb-2">Tarifs Traçabilité</h2>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  La traçabilité est incluse dans les plans payants NukuConnect.
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                {[
                  { name: "Pro", price: 5000, features: ["25 produits traçables", "QR codes", "Timeline complète", "Certifications"], icon: Star, popular: true },
                  { name: "Business", price: 15000, features: ["Produits illimités", "QR codes personnalisés", "Export PDF", "Support prioritaire"], icon: Crown, popular: false },
                  { name: "Entreprise", price: 30000, features: ["Tout Business +", "API d'intégration", "Audit traçabilité", "Support dédié 24/7"], icon: Zap, popular: false },
                ].map((plan) => {
                  const PlanIcon = plan.icon;
                  return (
                    <Card key={plan.name} className={`${plan.popular ? "border-2 border-primary shadow-lg" : ""}`}>
                      {plan.popular && <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">POPULAIRE</div>}
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${plan.popular ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                            <PlanIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-heading font-bold text-base">{plan.name}</h3>
                          </div>
                        </div>
                        <div className="mb-4">
                          <span className="text-2xl font-bold">{formatPrice(plan.price)}</span>
                          <span className="text-sm text-muted-foreground">/mois</span>
                        </div>
                        <ul className="space-y-2 mb-5">
                          {plan.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />{f}</li>
                          ))}
                        </ul>
                        <Link to="/plans">
                          <Button variant={plan.popular ? "hero" : "outline"} className="w-full gap-2">
                            <ArrowRight className="w-4 h-4" />Souscrire
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Why traceability */}
      <section className="py-10 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-xl font-bold text-center mb-6">Pourquoi la traçabilité ?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {[
              { icon: Shield, title: "Confiance", desc: "Garantie d'origine et de qualité." },
              { icon: Leaf, title: "Transparence", desc: "Méthodes de culture visibles." },
              { icon: Package, title: "Suivi complet", desc: "9 étapes de la production à la livraison." },
              { icon: CheckCircle2, title: "Qualité certifiée", desc: "Contrôles à chaque étape." },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Card key={i} className="text-center p-5">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3"><Icon className="w-5 h-5 text-primary" /></div>
                  <h3 className="font-heading font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(code) => {
          setSearchCode(code);
          handleSearch();
        }}
      />

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Traceability;
