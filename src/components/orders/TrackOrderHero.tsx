import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package, CheckCircle2, Truck, MapPin, Search, Loader2, Receipt,
  Box, ShieldCheck, AlertCircle, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * "Suivre une commande" panel — clean, professional, image-free.
 *
 * - Header is a compact branded bar (no decorative photo).
 * - Order number is shown once (truncated to 8 chars), no duplicates.
 * - Steps reflect the order lifecycle: Commandée → Confirmée →
 *   Préparation → Expédiée → Livrée. Failed orders are surfaced with a
 *   dedicated error state.
 */

type StepKey = "ordered" | "confirmed" | "processing" | "shipped" | "delivered";

const STEPS: { key: StepKey; label: string; icon: any }[] = [
  { key: "ordered",    label: "Commandée",   icon: Receipt },
  { key: "confirmed",  label: "Payée",       icon: ShieldCheck },
  { key: "processing", label: "Préparation", icon: Box },
  { key: "shipped",    label: "Expédiée",    icon: Truck },
  { key: "delivered",  label: "Livrée",      icon: CheckCircle2 },
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
      const shortMatch = id.length < 36;
      const { data, error: rpcErr } = await (supabase as any).rpc(
        "get_order_tracking_public",
        { p_order_id_prefix: id, p_email: mail },
      );
      if (rpcErr) {
        let query = supabase
          .from("orders")
          .select("id, status, total_price, created_at, products(name, images, unit), deliveries(status, dropoff_address, delivered_at), profiles!orders_buyer_id_fkey(user_id)")
          .limit(1);
        query = shortMatch ? query.ilike("id", `${id}%`) : query.eq("id", id);
        const { data: rows, error: e2 } = await query;
        if (e2) throw e2;
        const row = (rows || [])[0];
        if (!row) { setError("Commande introuvable."); return; }
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
      if (row.status === "pending") {
        setError("Cette commande n'est pas encore confirmée. Le suivi sera disponible dès le paiement validé.");
        return;
      }
      setOrder(row as any);
    } catch (e: any) {
      console.error("[track-order] lookup failed", e);
      setError(e?.message || "Erreur de recherche");
      toast.error("Recherche impossible", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const isFailed = order?.status === "failed" || order?.status === "cancelled";
  const currentStep = order && !isFailed
    ? reachedStep(order.status, order.deliveries?.[0]?.status)
    : -1;

  const orderRef = order ? order.id.slice(0, 8).toUpperCase() : "";

  return (
    <Card className="overflow-hidden border-border/60">
      {/* Compact branded header — no decorative photo */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/60 px-4 sm:px-5 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
          <Truck className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h2 className="font-heading text-sm sm:text-base font-bold leading-tight">
            Suivre une commande
          </h2>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Numéro de commande + email pour afficher le parcours en temps réel.
          </p>
        </div>
      </div>

      <CardContent className="p-4 sm:p-5 space-y-4">
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
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {order && (
          <div className="space-y-4 pt-3 border-t border-border/60">
            {/* Order summary — single ID, no duplicates, no decorative image */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  Commande
                </p>
                <p className="font-mono text-sm font-bold">#{orderRef}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {order.products?.name || "Produit"} · {new Date(order.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-primary">
                  {Number(order.total_price).toLocaleString("fr-FR")} FCFA
                </p>
                <Badge
                  variant="outline"
                  className={`text-[10px] mt-0.5 ${
                    isFailed
                      ? "bg-destructive/10 text-destructive border-destructive/30"
                      : currentStep === 4
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-300"
                        : "bg-primary/10 text-primary border-primary/30"
                  }`}
                >
                  {isFailed
                    ? order.status === "cancelled" ? "Annulée" : "Échouée"
                    : STEPS[Math.max(0, currentStep)]?.label}
                </Badge>
              </div>
            </div>

            {/* Failed state */}
            {isFailed ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  {order.status === "cancelled"
                    ? "Cette commande a été annulée."
                    : "Le paiement de cette commande a échoué. Vous pouvez relancer le paiement depuis Mes commandes."}
                </span>
              </div>
            ) : (
              /* Clean journey timeline — no images, equal spacing */
              <ol className="relative grid grid-cols-5 gap-0">
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
                          aria-hidden="true"
                        />
                      )}
                      <div
                        className={`relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                          active
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-card border-border text-muted-foreground"
                        } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                      >
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <span
                        className={`mt-1.5 text-[9px] sm:text-[10px] font-medium leading-tight px-0.5 ${
                          active ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {s.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            {order.deliveries?.[0]?.dropoff_address && !isFailed && (
              <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/30 rounded-md px-2.5 py-2">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                <span><strong className="text-foreground">Livraison :</strong> {order.deliveries[0].dropoff_address}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackOrderHero;
