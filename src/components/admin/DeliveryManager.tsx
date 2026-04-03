import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { Truck, Clock, CheckCircle, MapPin, Loader2, Package, User } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  pending: { label: "En attente", variant: "secondary", color: "text-yellow-600" },
  accepted: { label: "Acceptée", variant: "outline", color: "text-blue-600" },
  picked_up: { label: "Récupérée", variant: "outline", color: "text-purple-600" },
  in_transit: { label: "En cours", variant: "default", color: "text-primary" },
  delivered: { label: "Livrée", variant: "default", color: "text-green-600" },
  cancelled: { label: "Annulée", variant: "destructive", color: "text-destructive" },
};

const DeliveryManager = () => {
  const { formatPrice } = useLanguage();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("deliveries")
        .select("*, driver_profiles:driver_id(id, vehicle_type, zone, profiles:profile_id(full_name))")
        .order("created_at", { ascending: false })
        .limit(100);
      setDeliveries(data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const pending = deliveries.filter(d => d.status === "pending").length;
  const inTransit = deliveries.filter(d => d.status === "in_transit" || d.status === "accepted" || d.status === "picked_up").length;
  const delivered = deliveries.filter(d => d.status === "delivered").length;
  const totalFees = deliveries.reduce((s, d) => s + Number(d.delivery_fee || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <Clock className="w-5 h-5 mx-auto text-yellow-600 mb-1" />
            <p className="text-lg font-bold">{pending}</p>
            <p className="text-[10px] text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Truck className="w-5 h-5 mx-auto text-blue-600 mb-1" />
            <p className="text-lg font-bold">{inTransit}</p>
            <p className="text-[10px] text-muted-foreground">En cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle className="w-5 h-5 mx-auto text-green-600 mb-1" />
            <p className="text-lg font-bold">{delivered}</p>
            <p className="text-[10px] text-muted-foreground">Livrées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Package className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{formatPrice(totalFees)}</p>
            <p className="text-[10px] text-muted-foreground">Frais totaux</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />Livraisons ({deliveries.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <div className="space-y-2">
            {deliveries.map(d => {
              const st = STATUS_MAP[d.status] || STATUS_MAP.pending;
              const driverName = (d.driver_profiles as any)?.profiles?.full_name;
              return (
                <div key={d.id} className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-xl border border-border/30">
                  <Truck className={`w-5 h-5 flex-shrink-0 ${st.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs">
                      {driverName ? (
                        <span className="font-medium">{driverName}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Aucun livreur</span>
                      )}
                      {(d.driver_profiles as any)?.vehicle_type && (
                        <Badge variant="outline" className="text-[8px]">{(d.driver_profiles as any).vehicle_type}</Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      {d.pickup_address && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{d.pickup_address}</span>}
                      {d.distance_km && <span>{Number(d.distance_km).toFixed(1)} km</span>}
                      <span>{new Date(d.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-0.5">
                    <Badge variant={st.variant} className="text-[9px]">{st.label}</Badge>
                    <p className="text-xs font-semibold text-primary">{formatPrice(Number(d.delivery_fee || 0))}</p>
                  </div>
                </div>
              );
            })}
            {deliveries.length === 0 && (
              <div className="text-center py-8">
                <Truck className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Aucune livraison enregistrée</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryManager;
