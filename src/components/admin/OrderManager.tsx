import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
  ShoppingCart, Search, Package, CheckCircle, Truck, XCircle,
  Clock, Loader2, Eye, ChevronRight, User, MapPin, Calendar
} from "lucide-react";

interface Props {
  orders: any[];
  stats: any;
  onRefresh: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any; color: string }> = {
  pending: { label: "En attente", variant: "secondary", icon: Clock, color: "text-yellow-600" },
  confirmed: { label: "Confirmée", variant: "default", icon: CheckCircle, color: "text-blue-600" },
  shipped: { label: "Expédiée", variant: "outline", icon: Truck, color: "text-purple-600" },
  completed: { label: "Livrée", variant: "default", icon: Package, color: "text-green-600" },
  cancelled: { label: "Annulée", variant: "destructive", icon: XCircle, color: "text-destructive" },
};

const NEXT_STATUS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};

const OrderManager = ({ orders, stats, onRefresh }: Props) => {
  const { formatPrice } = useLanguage();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [adminNote, setAdminNote] = useState("");

  const filtered = orders.filter((o: any) => {
    const matchSearch = !search ||
      o.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.seller_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter((o: any) => o.status === "pending").length,
    confirmed: orders.filter((o: any) => o.status === "confirmed").length,
    shipped: orders.filter((o: any) => o.status === "shipped").length,
    completed: orders.filter((o: any) => o.status === "completed").length,
    cancelled: orders.filter((o: any) => o.status === "cancelled").length,
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(true);
    try {
      const updateData: any = { status: newStatus };
      if (adminNote.trim()) updateData.notes = adminNote.trim();

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;
      toast.success(`Commande ${STATUS_CONFIG[newStatus]?.label.toLowerCase() || newStatus}`);
      setSelectedOrder(null);
      setAdminNote("");
      onRefresh();
    } catch (err: any) {
      toast.error("Erreur: " + (err.message || "Impossible de mettre à jour"));
    }
    setUpdating(false);
  };

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    return (
      <Badge variant={cfg.variant} className="text-[9px] gap-1">
        <Icon className="w-2.5 h-2.5" />
        {cfg.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Status summary cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {Object.entries(statusCounts).map(([key, count]) => {
          const cfg = key === "all" ? { label: "Toutes", color: "text-foreground", icon: ShoppingCart } : STATUS_CONFIG[key];
          const Icon = cfg?.icon || ShoppingCart;
          return (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`p-2 rounded-lg text-center transition-colors border ${
                filterStatus === key ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              <Icon className={`w-4 h-4 mx-auto mb-0.5 ${cfg?.color || "text-foreground"}`} />
              <p className="text-lg font-bold">{count}</p>
              <p className="text-[9px] text-muted-foreground">{cfg?.label || "Toutes"}</p>
            </button>
          );
        })}
      </div>

      {/* Search & list */}
      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1">
              <CardTitle className="text-sm">Gestion des commandes</CardTitle>
              <CardDescription className="text-[11px]">
                {filtered.length} commande(s) • {formatPrice(Number(stats?.total_revenue || 0))} de revenus
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Rechercher produit, acheteur..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <div className="space-y-2">
            {filtered.map((o: any) => (
              <div
                key={o.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 cursor-pointer transition-colors border border-border/30"
                onClick={() => { setSelectedOrder(o); setAdminNote(o.notes || ""); }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{o.product_name || "Produit"}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{o.buyer_name || "Acheteur"}</span>
                    <ChevronRight className="w-2.5 h-2.5" />
                    <span>{o.seller_name || "Vendeur"}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Qté: {o.quantity} • {new Date(o.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <p className="text-sm font-bold text-primary">{formatPrice(Number(o.total_price))}</p>
                  {getStatusBadge(o.status)}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-8">
                <ShoppingCart className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Aucune commande trouvée</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order detail dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Détails de la commande
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Order info grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Produit</p>
                  <p className="font-semibold">{selectedOrder.product_name}</p>
                  <p className="text-[10px] text-muted-foreground">Catégorie: {selectedOrder.product_category || "—"}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Montant</p>
                  <p className="font-bold text-primary text-base">{formatPrice(Number(selectedOrder.total_price))}</p>
                  <p className="text-[10px] text-muted-foreground">Qté: {selectedOrder.quantity}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Acheteur</p>
                  <p className="font-medium">{selectedOrder.buyer_name || "—"}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Vendeur</p>
                  <p className="font-medium">{selectedOrder.seller_name || "—"}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5 col-span-2">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Statut actuel</p>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedOrder.status)}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(selectedOrder.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Admin note */}
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Note admin</label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Ajouter une note interne..."
                  className="text-xs min-h-[50px] mt-1"
                />
              </div>

              {/* Action buttons */}
              {NEXT_STATUS[selectedOrder.status]?.length > 0 && (
                <DialogFooter className="flex flex-wrap gap-2 sm:gap-2">
                  {NEXT_STATUS[selectedOrder.status].map((nextStatus) => {
                    const cfg = STATUS_CONFIG[nextStatus];
                    const Icon = cfg.icon;
                    return (
                      <Button
                        key={nextStatus}
                        variant={nextStatus === "cancelled" ? "destructive" : "default"}
                        size="sm"
                        className="gap-1.5 text-xs flex-1"
                        disabled={updating}
                        onClick={() => updateOrderStatus(selectedOrder.id, nextStatus)}
                      >
                        {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
                        {cfg.label}
                      </Button>
                    );
                  })}
                </DialogFooter>
              )}
              {(NEXT_STATUS[selectedOrder.status]?.length === 0) && (
                <p className="text-[10px] text-muted-foreground text-center">Cette commande est finalisée.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderManager;
