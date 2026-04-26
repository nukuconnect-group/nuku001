import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Truck, Clock, CheckCircle, MapPin, Loader2, Package, Globe, Filter } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  pending: { label: "En attente", variant: "secondary", color: "text-yellow-600" },
  accepted: { label: "Acceptée", variant: "outline", color: "text-blue-600" },
  picked_up: { label: "Récupérée", variant: "outline", color: "text-purple-600" },
  in_transit: { label: "En cours", variant: "default", color: "text-primary" },
  delivered: { label: "Livrée", variant: "default", color: "text-green-600" },
  cancelled: { label: "Annulée", variant: "destructive", color: "text-destructive" },
};

// Reference local country (Togo) — anything else is treated as international
const LOCAL_COUNTRY_KEYWORDS = ["togo", "lome", "lomé"];

const isCountryLocal = (country?: string | null) => {
  if (!country) return null; // unknown — fall back
  const c = country.trim().toLowerCase();
  if (!c) return null;
  return LOCAL_COUNTRY_KEYWORDS.some(k => c.includes(k));
};

// Primary signal: explicit country from buyer's saved address.
// Fallbacks: dropoff_address text, then buyer profile location.
const isInternational = (
  buyerCountry?: string | null,
  dropoffAddress?: string | null,
  buyerLocation?: string | null,
) => {
  const fromCountry = isCountryLocal(buyerCountry);
  if (fromCountry !== null) return !fromCountry;
  const text = `${dropoffAddress || ""} ${buyerLocation || ""}`.toLowerCase().trim();
  if (!text) return false;
  return !LOCAL_COUNTRY_KEYWORDS.some(k => text.includes(k));
};

const DeliveryManager = () => {
  const { formatPrice } = useLanguage();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeFilter, setScopeFilter] = useState<"all" | "local" | "international">("all");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("deliveries")
        .select("*, driver_profiles:driver_id(id, vehicle_type, zone, profiles:profile_id(full_name)), orders:order_id(buyer_id, profiles:buyer_id(full_name, location, user_id))")
        .order("created_at", { ascending: false })
        .limit(100);

      const rows = data || [];

      // Enrich with buyer's default delivery address country (primary signal)
      const buyerUserIds = Array.from(new Set(
        rows.map(r => (r.orders as any)?.profiles?.user_id).filter(Boolean)
      ));
      let countryByUser = new Map<string, string>();
      if (buyerUserIds.length > 0) {
        const { data: addrs } = await supabase
          .from("delivery_addresses")
          .select("user_id, country, is_default")
          .in("user_id", buyerUserIds);
        (addrs || []).forEach((a: any) => {
          // prefer default; otherwise first seen
          if (a.country && (a.is_default || !countryByUser.has(a.user_id))) {
            countryByUser.set(a.user_id, a.country);
          }
        });
      }
      rows.forEach((r: any) => {
        const uid = r.orders?.profiles?.user_id;
        r._buyer_country = uid ? countryByUser.get(uid) || null : null;
      });

      setDeliveries(rows);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (scopeFilter === "all") return deliveries;
    return deliveries.filter(d => {
      const buyerLoc = (d.orders as any)?.profiles?.location || "";
      const intl = isInternational(d._buyer_country, d.dropoff_address, buyerLoc);
      return scopeFilter === "international" ? intl : !intl;
    });
  }, [deliveries, scopeFilter]);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const pending = deliveries.filter(d => d.status === "pending").length;
  const inTransit = deliveries.filter(d => d.status === "in_transit" || d.status === "accepted" || d.status === "picked_up").length;
  const delivered = deliveries.filter(d => d.status === "delivered").length;
  const totalFees = deliveries.reduce((s, d) => s + Number(d.delivery_fee || 0), 0);
  const intlCount = deliveries.filter(d => isInternational(d._buyer_country, d.dropoff_address, (d.orders as any)?.profiles?.location)).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
        <Card className="border-secondary/40">
          <CardContent className="p-3 text-center">
            <Globe className="w-5 h-5 mx-auto text-secondary mb-1" />
            <p className="text-lg font-bold">{intlCount}</p>
            <p className="text-[10px] text-muted-foreground">International</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />Demandes de livraison ({filtered.length})
              </CardTitle>
              <CardDescription className="text-[11px]">
                Inclut les demandes nationales et internationales (acheteurs hors-Togo).
              </CardDescription>
            </div>
            <div className="flex gap-1 items-center">
              <Filter className="w-3 h-3 text-muted-foreground" />
              {(["all", "local", "international"] as const).map(s => (
                <Button
                  key={s}
                  variant={scopeFilter === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setScopeFilter(s)}
                  className="h-7 text-[10px] px-2"
                >
                  {s === "all" ? "Toutes" : s === "local" ? "Local" : "International"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <div className="space-y-2">
            {filtered.map(d => {
              const st = STATUS_MAP[d.status] || STATUS_MAP.pending;
              const driverName = (d.driver_profiles as any)?.profiles?.full_name;
              const buyer = (d.orders as any)?.profiles;
              const intl = isInternational(d._buyer_country, d.dropoff_address, buyer?.location);
              return (
                <div key={d.id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${intl ? "bg-secondary/5 border-secondary/40" : "bg-muted/30 border-border/30"}`}>
                  {intl ? <Globe className="w-5 h-5 flex-shrink-0 text-secondary" /> : <Truck className={`w-5 h-5 flex-shrink-0 ${st.color}`} />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs flex-wrap">
                      {driverName ? (
                        <span className="font-medium">{driverName}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Aucun livreur</span>
                      )}
                      {(d.driver_profiles as any)?.vehicle_type && (
                        <Badge variant="outline" className="text-[8px]">{(d.driver_profiles as any).vehicle_type}</Badge>
                      )}
                      {intl && <Badge className="text-[8px] bg-secondary/15 text-secondary border-secondary/30">🌍 International</Badge>}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      {buyer?.full_name && <span>👤 {buyer.full_name}</span>}
                      {(d.dropoff_address || buyer?.location) && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {d.dropoff_address || buyer?.location}
                        </span>
                      )}
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
            {filtered.length === 0 && (
              <div className="text-center py-8">
                <Truck className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Aucune demande de livraison pour ce filtre</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryManager;
