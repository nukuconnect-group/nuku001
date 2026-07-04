import SEO from "@/components/SEO";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import heroDeliveryAsset from "@/assets/delivery-hero-modern.jpg.asset.json";
const heroDelivery = heroDeliveryAsset.url;
import DeliveryChat from "@/components/delivery/DeliveryChat";
import DriverLiveMap from "@/components/delivery/DriverLiveMap";
import DriverRatingModal from "@/components/delivery/DriverRatingModal";
import { 
  Truck, Package, Clock, CheckCircle2, MessageCircle, Star,
  AlertCircle, ShoppingCart, Loader2, LogIn, RefreshCw, FileDown, Search, X, Hash, Mail, MapPin, ShieldCheck
} from "lucide-react";

const DeliveryTracking = () => {
  const navigate = useNavigate();
  const { formatPrice } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"list" | "search">("list");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  // Public tracking (no login required) — order ID + buyer email
  const [publicOrderId, setPublicOrderId] = useState("");
  const [publicEmail, setPublicEmail] = useState("");
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState("");
  const [publicResult, setPublicResult] = useState<any>(null);

  const fetchOrders = async (prof: any) => {
    const { data } = await supabase
      .from("orders")
      .select("*, products(name, images, category, unit, price, location), profiles!orders_seller_id_fkey(full_name)")
      .or(`buyer_id.eq.${prof.id},seller_id.eq.${prof.id}`)
      .order("created_at", { ascending: false });
    // "Suivre commande" ne doit afficher que les commandes réellement engagées :
    // on masque les commandes en attente de paiement (pending / awaiting_payment).
    const trackable = (data || []).filter((o: any) =>
      !["pending", "awaiting_payment"].includes(String(o.status))
    );
    setOrders(trackable);
    if (trackable.length > 0 && !selectedOrder) setSelectedOrder(trackable[0]);
    if (selectedOrder) {
      const updated = trackable.find((o: any) => o.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
    }
    // Fetch delivery records for these orders
    if (data && data.length > 0) {
      const orderIds = data.map((o: any) => o.id);
      const { data: dels } = await supabase
        .from("deliveries")
        .select("*")
        .in("order_id", orderIds);
      const delMap: Record<string, any> = {};
      for (const d of ((dels as any[]) || [])) {
        let driverName: string | null = null;
        if (d.driver_id) {
          const { data: dp } = await supabase
            .from("driver_profiles")
            .select("profile_id")
            .eq("id", d.driver_id)
            .maybeSingle();
          if (dp?.profile_id) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", dp.profile_id)
              .maybeSingle();
            driverName = prof?.full_name || null;
          }
        }
        delMap[d.order_id] = { ...d, driver_name: driverName };
      }
      setDeliveries(delMap);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) { setIsLoading(false); return; }
      setUser(session.user);
      const { data: prof } = await supabase.from("profiles").select("id, user_type, full_name").eq("user_id", session.user.id).maybeSingle();
      if (!mounted) return;
      setProfile(prof);
      if (prof) await fetchOrders(prof);
      if (mounted) setIsLoading(false);
    };
    load();

    // Keep auth state in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: prof } = await supabase.from("profiles").select("id, user_type, full_name").eq("user_id", session.user.id).maybeSingle();
        if (!mounted) return;
        setProfile(prof);
        if (prof) await fetchOrders(prof);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('order-tracking')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders(profile);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchError("");
    setSelectedOrder(null);

    // Search by order ID (full or partial)
    const { data, error } = await supabase
      .from("orders")
      .select("*, products(name, images, category, unit, price, location), profiles!orders_seller_id_fkey(full_name)")
      .or(`id.eq.${q},id.ilike.%${q}%`)
      .limit(10);

    if (error || !data || data.length === 0) {
      // Try searching by product name
      const { data: byProduct } = await supabase
        .from("orders")
        .select("*, products(name, images, category, unit, price, location), profiles!orders_seller_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(50);

      const filtered = (byProduct || []).filter((o: any) =>
        o.products?.name?.toLowerCase().includes(q.toLowerCase()) ||
        o.id.toLowerCase().includes(q.toLowerCase())
      );

      if (filtered.length > 0) {
        setOrders(filtered);
        setSelectedOrder(filtered[0]);
        setSearchMode("search");
      } else {
        setSearchError("Aucune commande trouvée avec cet identifiant. Vérifiez le numéro et réessayez.");
      }
    } else {
      setOrders(data);
      setSelectedOrder(data[0]);
      setSearchMode("search");
    }
    setSearchLoading(false);
  };

  const resetSearch = async () => {
    setSearchQuery("");
    setSearchError("");
    setSearchMode("list");
    setSelectedOrder(null);
    if (profile) await fetchOrders(profile);
  };

  // UUID v4-ish validation (8-4-4-4-12)
  const looksLikeUuid = (v: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim());

  const handlePublicTrack = async () => {
    setPublicError("");
    setPublicResult(null);
    const id = publicOrderId.trim();
    const email = publicEmail.trim();
    if (!id || !email) {
      setPublicError("Veuillez saisir l'ID de commande et votre email.");
      return;
    }
    if (!looksLikeUuid(id)) {
      setPublicError("L'ID de commande semble invalide. Vérifiez sur votre facture ou email de confirmation.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setPublicError("Adresse email invalide.");
      return;
    }
    setPublicLoading(true);
    const { data, error } = await supabase.rpc("track_order_public" as any, {
      p_order_id: id,
      p_email: email,
    });
    setPublicLoading(false);
    if (error) {
      setPublicError("Erreur de connexion. Réessayez dans un instant.");
      return;
    }
    const res = data as any;
    if (res?.error === "not_found") {
      setPublicError("Aucune commande trouvée avec cet identifiant.");
      return;
    }
    if (res?.error === "email_mismatch") {
      setPublicError("L'email ne correspond pas à cette commande. Utilisez l'email lié au compte qui a passé la commande.");
      return;
    }
    if (res?.error) {
      setPublicError("Impossible de récupérer cette commande.");
      return;
    }
    setPublicResult(res);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": case "delivered": return "bg-primary text-primary-foreground";
      case "in-transit": case "shipped": return "bg-blue-500 text-white";
      case "pending": return "bg-accent text-accent-foreground";
      case "confirmed": return "bg-emerald-500 text-white";
      case "cancelled": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": case "delivered": return "Livré";
      case "in-transit": case "shipped": return "En transit";
      case "pending": return "En attente";
      case "confirmed": return "Confirmé";
      case "cancelled": return "Annulée";
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": case "delivered": return <CheckCircle2 className="w-4 h-4" />;
      case "in-transit": case "shipped": return <Truck className="w-4 h-4" />;
      case "pending": return <Clock className="w-4 h-4" />;
      case "confirmed": return <Package className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getOrderSteps = (order: any) => {
    const dateStr = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    type Step = { status: "done" | "current" | "pending"; title: string; desc: string; time: string; icon: any };
    const steps: Step[] = [
      { status: "done", title: "Commande passée", desc: "Commande enregistrée avec succès", time: dateStr(order.created_at), icon: <ShoppingCart className="w-3.5 h-3.5" /> },
      { status: "done", title: "Paiement validé", desc: "Paiement confirmé", time: dateStr(order.created_at), icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    ];
    if (order.status === "pending") {
      steps.push({ status: "current", title: "Préparation en cours", desc: "Le vendeur prépare votre commande", time: "", icon: <Package className="w-3.5 h-3.5" /> });
      steps.push({ status: "pending", title: "Expédition", desc: "En attente d'envoi", time: "", icon: <Truck className="w-3.5 h-3.5" /> });
      steps.push({ status: "pending", title: "Livraison", desc: "En attente de livraison", time: "", icon: <CheckCircle2 className="w-3.5 h-3.5" /> });
    } else if (order.status === "confirmed") {
      steps.push({ status: "done", title: "Préparation terminée", desc: "Commande prête pour expédition", time: "", icon: <Package className="w-3.5 h-3.5" /> });
      steps.push({ status: "current", title: "En attente d'expédition", desc: "Le vendeur va expédier sous peu", time: "", icon: <Truck className="w-3.5 h-3.5" /> });
      steps.push({ status: "pending", title: "Livraison", desc: "", time: "", icon: <CheckCircle2 className="w-3.5 h-3.5" /> });
    } else if (order.status === "shipped" || order.status === "in-transit") {
      steps.push({ status: "done", title: "Préparation terminée", desc: "Produit emballé", time: "", icon: <Package className="w-3.5 h-3.5" /> });
      steps.push({ status: "current", title: "En transit", desc: "En route vers vous", time: "", icon: <Truck className="w-3.5 h-3.5" /> });
      steps.push({ status: "pending", title: "Livraison", desc: "Estimation sous 24-48h", time: "", icon: <CheckCircle2 className="w-3.5 h-3.5" /> });
    } else if (order.status === "completed" || order.status === "delivered") {
      steps.push({ status: "done", title: "Préparation terminée", desc: "Produit emballé", time: "", icon: <Package className="w-3.5 h-3.5" /> });
      steps.push({ status: "done", title: "Expédié", desc: "Livré par le transporteur", time: "", icon: <Truck className="w-3.5 h-3.5" /> });
      steps.push({ status: "done", title: "Livré ✓", desc: "Commande reçue avec succès", time: dateStr(order.updated_at), icon: <CheckCircle2 className="w-3.5 h-3.5" /> });
    } else if (order.status === "cancelled") {
      steps.push({ status: "done", title: "Commande annulée", desc: "Cette commande a été annulée", time: dateStr(order.updated_at), icon: <AlertCircle className="w-3.5 h-3.5" /> });
    }
    return steps;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-14 lg:pb-0">
        <SEO url="/suivi-livraison" title="Suivi de Livraison" description="Suivez vos livraisons en temps réel avec le GPS intégré." noIndex />
        <Header />

        {/* Hero skeleton */}
        <section className="py-6 sm:py-8 bg-muted/30 border-b border-border">
          <div className="container mx-auto px-3 sm:px-4 flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-muted animate-pulse mb-3" />
            <div className="h-5 w-56 bg-muted animate-pulse rounded mb-2" />
            <div className="h-3 w-72 bg-muted animate-pulse rounded mb-4" />
            <div className="max-w-lg w-full flex gap-2">
              <div className="h-10 flex-1 bg-muted animate-pulse rounded-md" />
              <div className="h-10 w-24 bg-muted animate-pulse rounded-md" />
            </div>
          </div>
        </section>

        {/* Content skeleton: list + detail */}
        <section className="py-5 sm:py-8">
          <div className="container mx-auto px-3 sm:px-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Orders list */}
            <div className="lg:col-span-1 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3 sm:p-4 bg-card border border-border rounded-xl flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-muted animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                    <div className="h-2.5 w-1/2 bg-muted animate-pulse rounded" />
                    <div className="h-2.5 w-1/3 bg-muted animate-pulse rounded" />
                  </div>
                  <div className="h-5 w-14 bg-muted animate-pulse rounded-full flex-shrink-0" />
                </div>
              ))}
            </div>

            {/* Detail panel */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-4 sm:p-5 bg-card border border-border rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="h-16 bg-muted animate-pulse rounded-lg" />
                  <div className="h-16 bg-muted animate-pulse rounded-lg" />
                </div>
              </div>
              <div className="p-4 sm:p-5 bg-card border border-border rounded-xl space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-muted animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                      <div className="h-2.5 w-3/4 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />

      {/* Hero image */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          <img src={heroDelivery} alt="Livreur NukuConnect suivant une commande agricole" className="w-full h-full object-cover" width={1536} height={768} />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/78 to-background/35" />
        </div>
        <div className="container mx-auto px-3 sm:px-4 relative py-7 sm:py-10 lg:py-12">
          <div className="grid lg:grid-cols-[1fr_420px] gap-5 lg:gap-8 items-end">
            <div className="max-w-2xl">
              <Badge variant="secondary" className="mb-3 gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Livraison interne NukuConnect
              </Badge>
              <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">Suivre mes commandes</h1>
              <p className="text-sm sm:text-base text-muted-foreground mb-5">Visualisez le statut, le produit, le vendeur, la livraison et les preuves de suivi depuis le menu principal.</p>
              <div className="grid grid-cols-3 gap-2 max-w-lg">
                <div className="rounded-lg bg-card/90 border border-border p-2">
                  <Package className="w-4 h-4 text-primary mb-1" />
                  <p className="text-[10px] font-medium">Commande</p>
                </div>
                <div className="rounded-lg bg-card/90 border border-border p-2">
                  <MapPin className="w-4 h-4 text-primary mb-1" />
                  <p className="text-[10px] font-medium">Position</p>
                </div>
                <div className="rounded-lg bg-card/90 border border-border p-2">
                  <ShieldCheck className="w-4 h-4 text-primary mb-1" />
                  <p className="text-[10px] font-medium">Preuve</p>
                </div>
              </div>
            </div>

          {/* Search bar */}
          {user && (
            <div className="rounded-xl border border-border bg-card/95 backdrop-blur p-3 sm:p-4">
              <p className="text-xs font-semibold mb-2">Rechercher dans mes commandes</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Entrez l'ID de commande ou nom du produit..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-9 h-10 text-sm"
                  />
                </div>
                {searchMode === "search" ? (
                  <Button variant="outline" size="sm" onClick={resetSearch} className="gap-1.5 h-10">
                    <X className="w-4 h-4" />Effacer
                  </Button>
                ) : null}
                <Button variant="hero" size="sm" onClick={handleSearch} disabled={searchLoading} className="gap-1.5 h-10">
                  {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Chercher
                </Button>
              </div>
              {searchError && (
                <p className="text-xs text-destructive mt-2 flex items-center gap-1 justify-center">
                  <AlertCircle className="w-3.5 h-3.5" />{searchError}
                </p>
              )}
            </div>
          )}
          </div>

          {/* Public tracking — no login required */}
          <div className="max-w-2xl mt-5 p-3 sm:p-4 bg-card/95 backdrop-blur border border-border rounded-xl text-left">
            <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-primary" />
              Suivre une commande sans se connecter
            </p>
            <p className="text-[11px] text-muted-foreground mb-3">
              Saisissez l'<strong>ID de commande</strong> reçu par email ou sur la facture, puis votre <strong>email</strong> pour voir le parcours en temps réel.
            </p>
            <div className="space-y-2">
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ID de commande (ex: 8a1f...)"
                  value={publicOrderId}
                  onChange={(e) => setPublicOrderId(e.target.value)}
                  className="pl-9 h-10 text-sm font-mono"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email lié à la commande"
                  value={publicEmail}
                  onChange={(e) => setPublicEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePublicTrack()}
                  className="pl-9 h-10 text-sm"
                />
              </div>
              <Button variant="hero" size="sm" onClick={handlePublicTrack} disabled={publicLoading} className="w-full gap-1.5 h-10">
                {publicLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Suivre la commande
              </Button>
              {publicError && (
                <p className="text-xs text-destructive flex items-start gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{publicError}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Public tracking result */}
      {publicResult && (
        <section className="py-5">
          <div className="container mx-auto px-3 sm:px-4 max-w-2xl">
            <Card>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{publicResult.product?.name || "Commande"}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {publicResult.order?.quantity} {publicResult.product?.unit || "unités"} • {formatPrice(Number(publicResult.order?.total_price || 0))}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      Réf: {publicResult.order?.id}
                    </p>
                  </div>
                  <Badge className={`${getStatusColor(publicResult.order?.status)} self-start gap-1`}>
                    {getStatusIcon(publicResult.order?.status)}
                    {getStatusLabel(publicResult.order?.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {publicResult.seller_name && (
                  <div className="p-3 bg-muted/50 rounded-xl mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Vendeur</p>
                      <p className="text-sm font-medium">{publicResult.seller_name}</p>
                    </div>
                  </div>
                )}
                <h3 className="font-heading font-semibold text-sm mb-3">Parcours en temps réel</h3>
                <div className="space-y-0">
                  {getOrderSteps({
                    status: publicResult.order?.status,
                    created_at: publicResult.order?.created_at,
                    updated_at: publicResult.order?.updated_at,
                  }).map((step, i, arr) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          step.status === "done" ? "bg-primary text-primary-foreground" :
                          step.status === "current" ? "bg-blue-500 text-white animate-pulse" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {step.icon}
                        </div>
                        {i < arr.length - 1 && (
                          <div className={`w-0.5 h-8 ${step.status === "done" ? "bg-primary" : "bg-border"}`} />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className={`text-sm font-medium ${step.status === "pending" ? "text-muted-foreground" : "text-foreground"}`}>{step.title}</p>
                        {step.desc && <p className="text-xs text-muted-foreground">{step.desc}</p>}
                        {step.time && <p className="text-[10px] text-primary font-medium">{step.time}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      <section className="py-6">
        <div className="container mx-auto px-3 sm:px-4 max-w-4xl">
          {!user ? (
            <Card>
              <CardContent className="p-6 text-center">
                <LogIn className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-heading font-bold text-sm mb-1">Connectez-vous pour voir vos commandes</h3>
                <p className="text-xs text-muted-foreground mb-3">Vous pouvez aussi suivre une commande en haut de page avec son ID + email.</p>
                <Button variant="hero" size="sm" onClick={() => navigate("/auth")}>Se connecter</Button>
              </CardContent>
            </Card>
          ) : orders.length === 0 && searchMode === "list" ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading font-bold text-lg mb-2">Aucune commande</h3>
                <p className="text-sm text-muted-foreground mb-4">Vous n'avez pas encore passé de commande</p>
                <Button variant="hero" onClick={() => navigate("/marketplace")}>Explorer le marché</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-sm sm:text-base font-bold">
                  {searchMode === "search" 
                    ? `Résultats (${orders.length})` 
                    : `Mes commandes (${orders.length})`}
                </h2>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs"
                  onClick={() => { if (searchMode === "search") resetSearch(); else if (profile) fetchOrders(profile); }}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  {searchMode === "search" ? "Voir tout" : "Actualiser"}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {orders.map((order) => (
                  <Card key={order.id}
                    className={`cursor-pointer transition-all hover:shadow-md overflow-hidden ${selectedOrder?.id === order.id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedOrder(order)}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {order.products?.images?.[0] && (
                            <img src={order.products.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-xs sm:text-sm text-foreground line-clamp-1 break-words">
                              {order.products?.name || "Produit"}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono truncate">
                              ID: {order.id.substring(0, 8)}...
                            </p>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(order.status)} text-[10px] flex-shrink-0 whitespace-nowrap`}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                        <span className="truncate">{order.quantity} × {formatPrice(order.products?.price || 0)}</span>
                        <span className="font-bold text-primary text-xs whitespace-nowrap">{formatPrice(order.total_price)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground mt-1">
                        <span className="whitespace-nowrap">{new Date(order.created_at).toLocaleDateString("fr-FR")}</span>
                        {order.products?.location && (
                          <span className="truncate ml-2 text-right">{order.products.location}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Detail view */}
              {selectedOrder && (
                <Card className="overflow-hidden">
                  <CardHeader className="p-3 sm:p-4 pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm sm:text-base break-words">{selectedOrder.products?.name || "Commande"}</CardTitle>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">
                          {selectedOrder.quantity} {selectedOrder.products?.unit || "unités"} • {formatPrice(selectedOrder.total_price)}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                          Réf: {selectedOrder.id}
                        </p>
                      </div>
                      <Badge className={`${getStatusColor(selectedOrder.status)} self-start gap-1 whitespace-nowrap`}>
                        {getStatusIcon(selectedOrder.status)}
                        {getStatusLabel(selectedOrder.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-2 overflow-hidden">
                    {/* Seller info */}
                    {selectedOrder.profiles?.full_name && (
                      <div className="p-3 bg-muted/50 rounded-xl mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Vendeur</p>
                          <p className="text-sm font-medium">{selectedOrder.profiles.full_name}</p>
                        </div>
                      </div>
                    )}

                    {selectedOrder.notes && (
                      <div className="p-3 bg-muted/50 rounded-xl mb-4">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Détails</p>
                        <p className="text-xs">{selectedOrder.notes}</p>
                      </div>
                    )}

                    <h3 className="font-heading font-semibold text-sm mb-3">Suivi en temps réel</h3>
                    <div className="space-y-0">
                      {getOrderSteps(selectedOrder).map((step, i, arr) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                              step.status === "done" ? "bg-primary text-primary-foreground" :
                              step.status === "current" ? "bg-blue-500 text-white animate-pulse" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {step.icon}
                            </div>
                            {i < arr.length - 1 && (
                              <div className={`w-0.5 h-8 ${step.status === "done" ? "bg-primary" : "bg-border"}`} />
                            )}
                          </div>
                          <div className="pb-4">
                            <p className={`text-sm font-medium ${step.status === "pending" ? "text-muted-foreground" : "text-foreground"}`}>{step.title}</p>
                            {step.desc && <p className="text-xs text-muted-foreground">{step.desc}</p>}
                            {step.time && <p className="text-[10px] text-primary font-medium">{step.time}</p>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Live driver tracking map */}
                    {deliveries[selectedOrder.id] && !["delivered", "cancelled"].includes(deliveries[selectedOrder.id].status) && (
                      <div className="my-4">
                        <DriverLiveMap
                          delivery={deliveries[selectedOrder.id]}
                          driverName={deliveries[selectedOrder.id]?.driver_name}
                        />
                      </div>
                    )}

                    {/* Rate driver after delivery */}
                    {deliveries[selectedOrder.id]?.status === "delivered" && deliveries[selectedOrder.id]?.driver_id && (
                      <div className="my-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800 text-center">
                        <p className="text-sm font-medium mb-2">Comment s'est passée la livraison ?</p>
                        <DriverRatingModal
                          deliveryId={deliveries[selectedOrder.id].id}
                          driverId={deliveries[selectedOrder.id].driver_id}
                          driverName={deliveries[selectedOrder.id]?.driver_name || "le livreur"}
                          trigger={
                            <Button variant="hero" size="sm" className="gap-1.5">
                              <Star className="w-4 h-4" />Noter le livreur
                            </Button>
                          }
                          onRated={() => profile && fetchOrders(profile)}
                        />
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 mt-3">
                      {deliveries[selectedOrder.id] && !["delivered", "cancelled"].includes(deliveries[selectedOrder.id].status) ? (
                        <DeliveryChat
                          deliveryId={deliveries[selectedOrder.id].id}
                          currentUserRole="buyer"
                          otherPartyName="Livreur"
                          trigger={
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1">
                              <MessageCircle className="w-3.5 h-3.5" />Chat livreur
                            </Button>
                          }
                        />
                      ) : (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1"
                          onClick={() => navigate("/messages")}>
                          <MessageCircle className="w-3.5 h-3.5" />Contacter
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1"
                        onClick={() => {
                          const order = selectedOrder;
                          const notesParts = (order.notes || "").split(" | ");
                          const deliveryInfo = notesParts.find((n: string) => n.startsWith("Livraison:")) || "Retrait sur place";
                          const paymentInfo = notesParts.find((n: string) => n.startsWith("Paiement:"))?.replace("Paiement: ", "") || "Mobile Money";
                          const telInfo = notesParts.find((n: string) => n.startsWith("Tél:"))?.replace("Tél: ", "") || "";
                          const created = new Date(order.created_at);
                          const invoiceNumber = `NK-${created.getFullYear()}${String(created.getMonth() + 1).padStart(2, "0")}${String(created.getDate()).padStart(2, "0")}-${order.id.substring(0, 6).toUpperCase()}`;
                          generateInvoicePDF({
                            invoiceNumber,
                            date: created.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
                            buyerName: profile?.full_name || "Client",
                            deliveryMethod: deliveryInfo,
                            deliveryPrice: 0,
                            paymentMethod: paymentInfo,
                            mobileNumber: telInfo,
                            items: [{
                              name: order.products?.name || "Produit",
                              quantity: Number(order.quantity),
                              unitPrice: Number(order.products?.price || 0),
                              unit: order.products?.unit || "unité",
                              sellerName: order.profiles?.full_name || "Vendeur",
                            }],
                            subtotal: Number(order.total_price),
                            total: Number(order.total_price),
                          });
                        }}>
                        <FileDown className="w-3.5 h-3.5" />Facture
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1">
                        <AlertCircle className="w-3.5 h-3.5" />Signaler
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default DeliveryTracking;
