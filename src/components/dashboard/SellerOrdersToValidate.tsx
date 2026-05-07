import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Package, Truck, Globe, Store, Loader2, ShoppingBag, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  sellerProfileId: string;
}

type OrderRow = {
  id: string;
  status: string;
  delivery_method: string | null;
  total_price: number;
  quantity: number;
  notes: string | null;
  created_at: string;
  seller_confirmed_at: string | null;
  product_id: string;
  buyer_id: string;
  products?: { name: string } | null;
  buyer?: { full_name: string } | null;
};

const METHOD_META: Record<string, { label: string; icon: any; tone: string }> = {
  pickup: { label: "Retrait sur place", icon: Store, tone: "bg-secondary/15 text-secondary" },
  livreur: { label: "Livreur NukuConnect", icon: Truck, tone: "bg-primary/15 text-primary" },
  international: { label: "Livraison internationale", icon: Globe, tone: "bg-accent/20 text-accent-foreground" },
};

const SellerOrdersToValidate = ({ sellerProfileId }: Props) => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("id, status, delivery_method, total_price, quantity, notes, created_at, seller_confirmed_at, product_id, buyer_id, products(name), buyer:profiles!orders_buyer_id_fkey(full_name)" as any)
      .eq("seller_id", sellerProfileId)
      .in("status", ["confirmed", "pending"])
      .is("seller_confirmed_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) console.error("Load seller orders error:", error);
    setOrders((data as any) || []);
    setLoading(false);
  }, [sellerProfileId]);

  useEffect(() => {
    if (!sellerProfileId) return;
    load();
    const channel = supabase
      .channel(`seller-orders-${sellerProfileId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `seller_id=eq.${sellerProfileId}` }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sellerProfileId, load]);

  const validateOrder = async (order: OrderRow) => {
    setValidating(order.id);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ seller_confirmed_at: new Date().toISOString() } as any)
        .eq("id", order.id);
      if (error) throw error;

      const meta = METHOD_META[order.delivery_method || "pickup"] || METHOD_META.pickup;
      toast({
        title: `✅ Commande validée — ${meta.label}`,
        description: order.delivery_method === "international"
          ? "L'admin NukuConnect prend le relais avec ses partenaires de transport international."
          : order.delivery_method === "livreur"
          ? "Un livreur NukuConnect a été notifié pour récupérer la commande."
          : "L'acheteur a été notifié de venir récupérer sa commande.",
      });
      await load();
    } catch (err: any) {
      toast({ title: "Erreur de validation", description: err.message, variant: "destructive" });
    } finally {
      setValidating(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Chargement des commandes…
        </CardContent>
      </Card>
    );
  }

  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="text-sm flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" />
          Commandes à valider
          {orders.length > 0 && (
            <Badge className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 ml-1">
              {orders.length}
            </Badge>
          )}
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
            <Radio className="w-2.5 h-2.5" /> Temps réel
          </span>
        </CardTitle>
        {!expanded && (
          <CardDescription className="text-[11px]">
            {orders.length === 0
              ? "Aucune commande en attente."
              : `${orders.length} commande${orders.length > 1 ? "s" : ""} en attente — cliquez pour voir`}
          </CardDescription>
        )}
      </CardHeader>
      {expanded && (
        <CardContent className="p-3 sm:p-4 pt-0 space-y-2">
          {orders.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune commande en attente de votre validation.</p>
          ) : (
            orders.map(o => {
              const meta = METHOD_META[o.delivery_method || "pickup"] || METHOD_META.pickup;
              const Icon = meta.icon;
              const isPaid = o.status === "confirmed";
              return (
                <div key={o.id} className="border border-border rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Package className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="font-semibold text-xs truncate">{o.products?.name || "Produit"}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">Qté {o.quantity}</Badge>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${meta.tone}`}>
                        <Icon className="w-2.5 h-2.5" /> {meta.label}
                      </span>
                      {!isPaid && <Badge variant="secondary" className="text-[9px]">Paiement en attente</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {o.buyer?.full_name || "Acheteur"} • {Number(o.total_price).toLocaleString("fr-FR")} FCFA • {new Date(o.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                    {o.notes && <div className="text-[10px] text-muted-foreground/80 mt-0.5 line-clamp-1">{o.notes}</div>}
                  </div>
                  <Button
                    size="sm"
                    variant="hero"
                    disabled={!isPaid || validating === o.id}
                    onClick={() => validateOrder(o)}
                    className="flex-shrink-0"
                  >
                    {validating === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Valider la réception
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default SellerOrdersToValidate;
