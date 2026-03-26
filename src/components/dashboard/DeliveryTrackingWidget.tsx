import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, Package, Clock, CheckCircle2, Navigation, MapPin, ChevronRight, Loader2 } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: any; step: number }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-800", icon: Clock, step: 1 },
  confirmed: { label: "Confirmé", color: "bg-blue-100 text-blue-800", icon: CheckCircle2, step: 2 },
  accepted: { label: "Livreur assigné", color: "bg-blue-100 text-blue-800", icon: Truck, step: 2 },
  picked_up: { label: "Récupéré", color: "bg-purple-100 text-purple-800", icon: Package, step: 3 },
  in_transit: { label: "En livraison", color: "bg-orange-100 text-orange-800", icon: Navigation, step: 3 },
  delivered: { label: "Livré", color: "bg-green-100 text-green-800", icon: CheckCircle2, step: 4 },
};

const steps = [
  { label: "Confirmé", step: 1 },
  { label: "Récupéré", step: 2 },
  { label: "En route", step: 3 },
  { label: "Livré", step: 4 },
];

interface Props {
  profileId: string;
  role: "buyer" | "seller";
}

const DeliveryTrackingWidget = ({ profileId, role }: Props) => {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Get orders for this profile
      const orderField = role === "buyer" ? "buyer_id" : "seller_id";
      const { data: orders } = await supabase
        .from("orders")
        .select("id, status, products(name)")
        .eq(orderField, profileId)
        .in("status", ["pending", "confirmed", "shipped"])
        .order("created_at", { ascending: false })
        .limit(5);

      if (orders && orders.length > 0) {
        const orderIds = orders.map(o => o.id);
        const { data: dels } = await supabase
          .from("deliveries" as any)
          .select("*")
          .in("order_id", orderIds);
        
        // Combine
        const combined = orders.map(o => ({
          ...o,
          delivery: (dels as any[] || []).find((d: any) => d.order_id === o.id),
        }));
        setDeliveries(combined);
      }
      setLoading(false);
    };
    load();

    // Realtime
    const channel = supabase
      .channel("delivery-tracking-widget")
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profileId, role]);

  const activeDeliveries = deliveries.filter(d => d.delivery && !["delivered", "cancelled"].includes(d.delivery.status));

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (activeDeliveries.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="p-3 sm:p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            Livraisons en cours
          </CardTitle>
          <Link to="/suivi-livraison">
            <Button variant="ghost" size="sm" className="gap-1 text-[10px] h-7">
              Détails <ChevronRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
        {activeDeliveries.slice(0, 3).map((item) => {
          const status = statusConfig[item.delivery?.status] || statusConfig.pending;
          const StatusIcon = status.icon;
          const currentStep = status.step;

          return (
            <div key={item.id} className="bg-background rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{item.products?.name || "Commande"}</p>
                  <Badge className={`${status.color} text-[9px] mt-0.5`}>
                    <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                    {status.label}
                  </Badge>
                </div>
                {item.delivery?.estimated_minutes && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-muted-foreground">ETA</p>
                    <p className="text-xs font-semibold text-primary">~{item.delivery.estimated_minutes} min</p>
                  </div>
                )}
              </div>

              {/* Progress steps */}
              <div className="flex items-center gap-1">
                {steps.map((s, i) => (
                  <div key={s.step} className="flex-1 flex items-center">
                    <div className={`h-1.5 flex-1 rounded-full ${currentStep >= s.step ? "bg-primary" : "bg-muted"}`} />
                    {i < steps.length - 1 && <div className="w-0.5" />}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[8px] text-muted-foreground">
                {steps.map(s => (
                  <span key={s.step} className={currentStep >= s.step ? "text-primary font-medium" : ""}>
                    {s.label}
                  </span>
                ))}
              </div>

              {item.delivery?.dropoff_address && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {item.delivery.dropoff_address}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default DeliveryTrackingWidget;
