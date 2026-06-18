import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package, CheckCircle2, Truck, MapPin, Search, Loader2, Receipt,
  Box, ShieldCheck, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Amazon-style "Suivre une commande" hero panel.
 *
 * - Always visible at the top of /mes-commandes
 * - User enters an order ID (or invoice number) + their email
 * - Looks up the order, validates that the email matches the buyer
 *   (via `buyer_user_email` returned by `get_my_orders_with_tracking`,
 *    falling back to a profile lookup), then renders the product
 *   journey (Commandée → Confirmée → Préparation → Expédiée → Livrée).
 * - No pending/unpaid orders are surfaced here — only paid lifecycle.
 */

type StepKey = "ordered" | "confirmed" | "processing" | "shipped" | "delivered";

const STEPS: { key: StepKey; label: string; icon: any }[] = [
  { key: "ordered",    label: "Commande passée",   icon: Receipt },
  { key: "confirmed",  label: "Paiement confirmé", icon: ShieldCheck },
  { key: "processing", label: "En préparation",    icon: Box },
  { key: "shipped",    label: "Expédiée",          icon: Truck },
  { key: "delivered",  label: "Livrée",            icon: CheckCircle2 },
];

const reachedStep = (status: string, deliveryStatus?: string | null): number => {
  if (status === "delivered" || status === "completed") return 4;
  if (deliveryStatus === "in_transit" || deliveryStatus === "picked_up" || status === "shipped") return 3;
  if (status === "processing") return 2;
  if (status === "confirmed" || status === "paid") return 1;
  return 0;
};

interface FoundOrder {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  products: { name?: string; images?: string[]; unit?: string } | null;
  deliveries: { status?: string; dropoff_address?: string; delivered_at?: string | null }[];
}

const TrackOrderHero = () => {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<FoundOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = async () => {
    setError(null);
    setOrder(null);
    const id = orderId.trim();
    const mail = email.trim().toLowerCase();
    if (!id || !mail) {
      setError("Veuillez saisir un numéro de commande et votre email.");
      return;
    }
    setLoading(true);
    try {
      // Accept either a full UUID or the first 8 chars (as shown in UI / invoice)
      const shortMatch = id.length < 36;
      const { data, error: rpcErr } = await (supabase as any).rpc(
        "get_order_tracking_public",
        { p_order_id_prefix: id, p_email: mail },
      );
      if (rpcErr) {
        // Fallback: try direct table lookup if RPC is not available
        let query = supabase
          .from("orders")
          .select("id, status, total_price, created_at, products(name, images, unit), deliveries(status, dropoff_address, delivered_at), profiles!orders_buyer_id_fkey(user_id)")
          .limit(1);
        query = shortMatch ? query.ilike("id", `${id}%`) : query.eq("id", id);
        const { data: rows, error: e2 } = await query;
        if (e2) throw e2;
        const row = (rows || [])[0];
        if (!row) { setError("Commande introuvable."); return; }
        // Validate email
        const userId = (row as any).profiles?.user_id;
        let ok = false;
        if (userId) {
          const { data: au } = await supabase.auth.getUser();
          if (au?.user?.id === userId && au.user.email?.toLowerCase() === mail) ok = true;
        }
        if (!ok) { setError("L'email ne correspond pas à cette commande."); return; }
        setOrder(row as any);
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) { setError("Commande introuvable ou email incorrect."); return; }
      setOrder(row as any);
    } catch (e: any) {
      console.error("[track-order] lookup failed", e);
      setError(e?.message || "Erreur de recherche");
      toast.error("Recherche impossible", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const currentStep = order
    ? reachedStep(order.status, order.deliveries?.[0]?.status)
    : -1;

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-heading text-lg sm:text-xl font-bold leading-tight">
              Suivre une commande
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Entrez votre numéro de commande et votre email pour afficher le parcours du produit.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
          <Input
            placeholder="N° de commande (ex: A1B2C3D4)"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="h-10"
            aria-label="Numéro de commande"
          />
          <Input
            type="email"
            placeholder="Votre email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10"
            aria-label="Email de la commande"
          />
          <Button onClick={lookup} disabled={loading} className="h-10 gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Suivre
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {order && (
          <div className="space-y-4 pt-2 border-t border-border">
            {/* Product summary */}
            <div className="flex items-start gap-3">
              {order.products?.images?.[0] ? (
                <img
                  src={order.products.images[0]}
                  alt={order.products?.name || ""}
                  className="w-16 h-16 rounded-lg object-cover border border-border"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{order.products?.name || "Produit"}</p>
                <p className="text-[11px] text-muted-foreground">
                  N° {order.id.slice(0, 8).toUpperCase()} · {new Date(order.created_at).toLocaleDateString("fr-FR")}
                </p>
                <p className="text-sm font-bold text-primary mt-1">
                  {Number(order.total_price).toLocaleString("fr-FR")} FCFA
                </p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {STEPS[Math.max(0, currentStep)]?.label}
              </Badge>
            </div>

            {/* Journey timeline */}
            <ol className="relative grid grid-cols-5 gap-1">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const active = i <= currentStep;
                const isCurrent = i === currentStep;
                return (
                  <li key={s.key} className="flex flex-col items-center text-center relative">
                    {i > 0 && (
                      <span
                        className={`absolute top-4 right-1/2 w-full h-0.5 ${
                          i <= currentStep ? "bg-primary" : "bg-border"
                        }`}
                      />
                    )}
                    <div
                      className={`relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                        active
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-card border-border text-muted-foreground"
                      } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className={`mt-1 text-[9px] sm:text-[10px] font-medium leading-tight ${
                        active ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            {order.deliveries?.[0]?.dropoff_address && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                Livraison à : {order.deliveries[0].dropoff_address}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackOrderHero;
