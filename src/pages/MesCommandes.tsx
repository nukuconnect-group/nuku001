import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Package, Truck, CheckCircle2, Clock, XCircle, Receipt,
  ArrowLeft, Search, ShoppingBag, FileDown, MapPin, FileText, Download,
} from "lucide-react";
import { lazy, Suspense } from "react";
const DeliveryLiveMap = lazy(() => import("@/components/delivery/DeliveryLiveMap"));
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import { generateOrdersRecapPDF } from "@/utils/generateOrdersRecapPDF";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "En attente", icon: Clock, color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  confirmed: { label: "Confirmée", icon: CheckCircle2, color: "bg-blue-100 text-blue-800 border-blue-300" },
  processing: { label: "En préparation", icon: Package, color: "bg-purple-100 text-purple-800 border-purple-300" },
  shipped: { label: "Expédiée", icon: Truck, color: "bg-orange-100 text-orange-800 border-orange-300" },
  completed: { label: "Terminée", icon: CheckCircle2, color: "bg-green-100 text-green-800 border-green-300" },
  cancelled: { label: "Annulée", icon: XCircle, color: "bg-red-100 text-red-800 border-red-300" },
};

const DELIVERY_LABEL: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  picked_up: "Récupérée",
  in_transit: "En transit",
  delivered: "Livrée",
  cancelled: "Annulée",
};

type FilterTab = "all" | "active" | "completed" | "cancelled";
type DeliveryFilter = "all" | "pending" | "in_transit" | "delivered";

const matchesDeliveryFilter = (delivery: any, filter: DeliveryFilter) => {
  if (filter === "all") return true;
  const status = delivery?.status as string | undefined;
  if (filter === "pending") return !status || ["pending", "accepted"].includes(status);
  if (filter === "in_transit") return status ? ["picked_up", "in_transit"].includes(status) : false;
  if (filter === "delivered") return status === "delivered";
  return true;
};

const MesCommandes = () => {
  const navigate = useNavigate();
  const { user, profile, isReady } = useProfile();
  const { formatPrice } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("all");
  const [exporting, setExporting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!user) { navigate("/auth"); return; }
    if (!profile?.id) return;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*, products(name, images, price, unit), deliveries(id, status, delivered_at, driver_id, delivery_fee, driver_current_lat, driver_current_lng, pickup_address, dropoff_address)")
        .eq("buyer_id", profile.id)
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Impossible de charger vos commandes");
      } else {
        setOrders(data || []);
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("buyer-orders-realtime")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `buyer_id=eq.${profile.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isReady, user, profile?.id, navigate]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (tab === "active" && !["pending", "confirmed", "processing", "shipped"].includes(o.status)) return false;
      if (tab === "completed" && o.status !== "completed") return false;
      if (tab === "cancelled" && o.status !== "cancelled") return false;
      if (!matchesDeliveryFilter(o.deliveries?.[0], deliveryFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = o.products?.name?.toLowerCase() || "";
        if (!name.includes(q) && !o.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [orders, tab, deliveryFilter, search]);

  const stats = useMemo(() => {
    const total = orders.reduce((s, o) => s + Number(o.total_price || 0), 0);
    return {
      count: orders.length,
      total,
      pending: orders.filter((o) => ["pending", "confirmed", "processing", "shipped"].includes(o.status)).length,
      completed: orders.filter((o) => o.status === "completed").length,
    };
  }, [orders]);

  const handleInvoice = async (order: any) => {
    try {
      await generateInvoicePDF({ order, buyer: profile } as any);
      toast.success("Facture téléchargée");
    } catch {
      toast.error("Erreur lors de la génération de la facture");
    }
  };

  const handleExportRecap = async () => {
    if (filtered.length === 0) {
      toast.error("Aucune commande à exporter");
      return;
    }
    try {
      setExporting(true);
      generateOrdersRecapPDF({
        buyerName: profile?.full_name || profile?.email || "Acheteur",
        orders: filtered.map((o) => ({
          id: o.id,
          productName: o.products?.name || "Produit",
          quantity: Number(o.quantity || 0),
          unit: o.products?.unit,
          totalPrice: Number(o.total_price || 0),
          status: o.status,
          createdAt: o.created_at,
          deliveryStatus: o.deliveries?.[0]?.status || null,
          deliveredAt: o.deliveries?.[0]?.delivered_at || null,
        })),
      });
      toast.success(`Récapitulatif PDF (${filtered.length} commandes) téléchargé`);
    } catch (e) {
      console.error("[orders-recap] export failed", e);
      toast.error("Échec de l'export PDF");
    } finally {
      setExporting(false);
    }
  };

  const renderInvoicePanel = () => {
    if (!selectedOrder) return null;
    const o = selectedOrder;
    const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending;
    const delivery = o.deliveries?.[0];
    const productPrice = Number(o.products?.price || 0);
    const qty = Number(o.quantity || 0);
    const subtotal = productPrice * qty;
    const deliveryFee = Number(delivery?.delivery_fee || 0);
    const total = Number(o.total_price || 0);
    return (
      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 text-primary" /> Détails facture
            </SheetTitle>
            <SheetDescription className="text-[11px]">
              N° {o.id.slice(0, 8).toUpperCase()} — {new Date(o.created_at).toLocaleString("fr-FR")}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
              {delivery?.status && (
                <Badge variant="outline" className="text-[10px]">
                  Livraison : {DELIVERY_LABEL[delivery.status] || delivery.status}
                </Badge>
              )}
            </div>

            <Card>
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Lignes</p>
                <div className="flex items-start gap-3">
                  {o.products?.images?.[0] ? (
                    <img src={o.products.images[0]} alt={o.products.name} className="w-14 h-14 object-cover rounded-md" />
                  ) : (
                    <div className="w-14 h-14 bg-muted rounded-md flex items-center justify-center">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 text-xs">
                    <p className="font-semibold text-sm">{o.products?.name}</p>
                    <p className="text-muted-foreground">
                      {qty} {o.products?.unit || ""} × {formatPrice(productPrice)}
                    </p>
                    <p className="font-bold text-primary mt-1">{formatPrice(subtotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 space-y-2 text-xs">
                <p className="font-semibold text-muted-foreground">Montants</p>
                <div className="flex justify-between">
                  <span>Sous-total</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frais de livraison</span>
                  <span>{formatPrice(deliveryFee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-sm">
                  <span>Total payé</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 space-y-1.5 text-xs">
                <p className="font-semibold text-muted-foreground">Dates</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commandée le</span>
                  <span>{new Date(o.created_at).toLocaleString("fr-FR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Livrée le</span>
                  <span>{delivery?.delivered_at ? new Date(delivery.delivered_at).toLocaleString("fr-FR") : "—"}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button onClick={() => handleInvoice(o)} className="w-full" size="sm">
                <FileDown className="w-4 h-4 mr-2" /> Télécharger facture PDF
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to={`/commande/${o.id}`}>
                  <Receipt className="w-4 h-4 mr-2" /> Voir la page complète
                </Link>
              </Button>
              {delivery && (
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to="/suivi-livraison">
                    <MapPin className="w-4 h-4 mr-2" /> Suivre la livraison
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <>
      <Helmet>
        <title>Mes commandes | Nukuconnect</title>
        <meta name="description" content="Consultez le détail de vos commandes Nukuconnect : factures, paiements et traçabilité." />
      </Helmet>
      <Header />
      <main className="min-h-screen bg-background pb-24">
        <div className="container max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Retour">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" /> Mes commandes
                </h1>
                <p className="text-xs text-muted-foreground">Factures, paiements et traçabilité de vos achats</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportRecap}
              disabled={exporting || loading || filtered.length === 0}
              aria-label="Exporter récapitulatif PDF"
            >
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Exporter PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Total</p><p className="text-base font-bold">{stats.count}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">En cours</p><p className="text-base font-bold text-orange-600">{stats.pending}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Terminées</p><p className="text-base font-bold text-green-600">{stats.completed}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Montant total</p><p className="text-base font-bold text-primary">{formatPrice(stats.total)}</p></CardContent></Card>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par produit ou n° commande"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={deliveryFilter} onValueChange={(v) => setDeliveryFilter(v as DeliveryFilter)}>
                <SelectTrigger className="sm:w-56" aria-label="Filtrer par statut de livraison">
                  <Truck className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Statut livraison" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les livraisons</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="in_transit">En transit</SelectItem>
                  <SelectItem value="delivered">Livré</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="all">Toutes</TabsTrigger>
                <TabsTrigger value="active">En cours</TabsTrigger>
                <TabsTrigger value="completed">Terminées</TabsTrigger>
                <TabsTrigger value="cancelled">Annulées</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}><CardContent className="p-4 flex gap-3">
                  <Skeleton className="w-16 h-16 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </CardContent></Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-3">
                <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Aucune commande trouvée</p>
                <Button asChild size="sm"><Link to="/marketplace">Découvrir le marketplace</Link></Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((o) => {
                const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending;
                const StatusIcon = cfg.icon;
                const img = o.products?.images?.[0];
                const delivery = o.deliveries?.[0];
                return (
                  <Card
                    key={o.id}
                    onClick={() => setSelectedOrder(o)}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedOrder(o);
                      }
                    }}
                    aria-label={`Voir les détails de la commande ${o.id.slice(0, 8)}`}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex gap-3">
                        {img ? (
                          <img src={img} alt={o.products?.name} className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-md" loading="lazy" />
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-md flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm truncate">{o.products?.name || "Produit"}</h3>
                              <p className="text-[11px] text-muted-foreground">N° {o.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />{cfg.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                            <span>Qté : <strong className="text-foreground">{o.quantity}</strong></span>
                            <span className="font-bold text-primary text-sm">{formatPrice(Number(o.total_price))}</span>
                            <span>{new Date(o.created_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
                            {delivery?.status && (
                              <Badge variant="secondary" className="text-[10px]">
                                <Truck className="w-3 h-3 mr-1" />
                                {DELIVERY_LABEL[delivery.status] || delivery.status}
                              </Badge>
                            )}
                            {delivery?.delivered_at && (
                              <span className="text-muted-foreground">
                                Livré le {new Date(delivery.delivered_at).toLocaleDateString("fr-FR")}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setSelectedOrder(o)}
                              className="h-7 text-[11px]"
                            >
                              <Receipt className="w-3 h-3 mr-1" />Détails facture
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleInvoice(o)} className="h-7 text-[11px]">
                              <FileDown className="w-3 h-3 mr-1" />Facture
                            </Button>
                            {delivery && (
                              <Button size="sm" variant="outline" asChild className="h-7 text-[11px]">
                                <Link to="/suivi-livraison"><MapPin className="w-3 h-3 mr-1" />Suivre</Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      {renderInvoicePanel()}
      <Footer />
      <MobileBottomNav />
    </>
  );
};

export default MesCommandes;
