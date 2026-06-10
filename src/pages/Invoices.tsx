import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, FileText, Download, Search, Receipt } from "lucide-react";
import { generateOrderInvoice } from "@/utils/generateInvoicePDF";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  confirmed: { label: "Confirmée", className: "bg-blue-100 text-blue-800 border-blue-300" },
  processing: { label: "En préparation", className: "bg-purple-100 text-purple-800 border-purple-300" },
  shipped: { label: "Expédiée", className: "bg-orange-100 text-orange-800 border-orange-300" },
  completed: { label: "Payée", className: "bg-green-100 text-green-800 border-green-300" },
  cancelled: { label: "Annulée", className: "bg-red-100 text-red-800 border-red-300" },
};

const Invoices = () => {
  const navigate = useNavigate();
  const { user, profile, isReady } = useProfile();
  const { formatPrice } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [period, setPeriod] = useState("all"); // all | 30 | 90 | year

  useEffect(() => {
    if (!isReady) return;
    if (!user) { navigate("/auth"); return; }
    if (!profile?.id) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, user, profile?.id]);

  const load = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, products(name, price, unit), seller:profiles!orders_seller_id_fkey(full_name, business_name)")
      .eq("buyer_id", profile.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[invoices] load failed", error);
      toast.error("Impossible de charger vos factures", { description: error.message });
    }
    setOrders(data || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const now = Date.now();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (period !== "all") {
        const days = period === "year" ? 365 : Number(period);
        if (now - new Date(o.created_at).getTime() > days * 86400000) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const inv = invoiceNumber(o).toLowerCase();
        const name = (o.products?.name || "").toLowerCase();
        if (!inv.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, period, search]);

  const totalAmount = useMemo(
    () => filtered.reduce((s, o) => s + Number(o.total_price || 0), 0),
    [filtered],
  );

  const handleDownload = (order: any) => {
    try {
      const sellerName =
        order.seller?.display_name || order.seller?.full_name || "Vendeur";
      const item = {
        product: {
          id: order.product_id,
          name: order.products?.name || "Produit",
          price: Number(order.products?.price || order.total_price / (order.quantity || 1)),
          unit: order.products?.unit || "u",
          producer: { name: sellerName },
        },
        quantity: Number(order.quantity || 1),
      };
      const subtotal = item.product.price * item.quantity;
      const total = Number(order.total_price || subtotal);
      const delivery = Math.max(0, total - subtotal);

      generateOrderInvoice(
        [item],
        subtotal,
        delivery,
        total,
        order.delivery_method === "pickup" ? "Retrait" : "Livraison",
        "Mobile Money",
        profile?.display_name || profile?.full_name || "Client",
        profile?.phone || undefined,
      );
      toast.success("Facture téléchargée");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du téléchargement");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Helmet>
        <title>Mes factures – Nukuconnect</title>
        <meta name="description" content="Consultez et téléchargez toutes vos factures Nukuconnect au format PDF." />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold">Mes factures</h1>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-4">
          <Card><CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Total factures</p>
            <p className="text-lg font-bold">{filtered.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Montant total</p>
            <p className="text-lg font-bold text-primary">{formatPrice(totalAmount)}</p>
          </CardContent></Card>
          <Card className="col-span-2 md:col-span-1"><CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Payées</p>
            <p className="text-lg font-bold text-green-600">
              {filtered.filter((o) => o.status === "completed").length}
            </p>
          </CardContent></Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher (n° facture, produit)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toute la période</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="90">3 derniers mois</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-md" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Aucune facture trouvée</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((o) => {
              const cfg = STATUS_LABELS[o.status] || STATUS_LABELS.pending;
              return (
                <Card key={o.id} className="hover:shadow-sm transition">
                  <CardContent className="p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-[12px] font-semibold text-primary">
                            {invoiceNumber(o)}
                          </span>
                          <Badge className={`text-[11px] border ${cfg.className}`}>{cfg.label}</Badge>
                        </div>
                        <p className="text-sm font-medium truncate">{o.products?.name || "Commande"}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                          <span>{new Date(o.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit", month: "long", year: "numeric",
                          })}</span>
                          <span className="font-semibold text-foreground">{formatPrice(Number(o.total_price))}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-md shrink-0"
                        onClick={() => handleDownload(o)}
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

const invoiceNumber = (o: any) => {
  const d = new Date(o.created_at);
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `NK-${ymd}-${String(o.id).slice(0, 6).toUpperCase()}`;
};

export default Invoices;
