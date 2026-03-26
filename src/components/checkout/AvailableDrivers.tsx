import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Star, MapPin, Clock, Users, Loader2 } from "lucide-react";

interface Props {
  city: string;
  distanceKm: number | null;
}

interface Driver {
  id: string;
  vehicle_type: string;
  rating: number;
  total_deliveries: number;
  zone: string;
  profile?: { full_name: string; avatar_url: string };
}

const AvailableDrivers = ({ city, distanceKm }: Props) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!city) { setDrivers([]); return; }
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("driver_profiles" as any)
        .select("id, vehicle_type, rating, total_deliveries, zone, profile_id")
        .eq("is_available", true)
        .limit(5);

      if (data && data.length > 0) {
        // Get profile names
        const profileIds = (data as any[]).map(d => d.profile_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", profileIds);

        const enriched = (data as any[]).map(d => ({
          ...d,
          profile: (profiles || []).find(p => p.id === d.profile_id),
        }));
        setDrivers(enriched);
      } else {
        setDrivers([]);
      }
      setLoading(false);
    };
    load();
  }, [city]);

  if (!city) return null;

  const estimateTime = (km: number | null) => {
    if (!km) return "~30 min";
    if (km < 10) return `~${Math.max(15, Math.round(km * 3))} min`;
    if (km < 50) return `~${Math.round(km * 2.5)} min`;
    return `~${Math.round(km * 2)} min`;
  };

  const vehicleLabels: Record<string, string> = {
    moto: "🏍️ Moto",
    voiture: "🚗 Voiture",
    velo: "🚲 Vélo",
    camion: "🚛 Camion",
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
          <Truck className="w-4 h-4 text-primary" />
          Livreurs disponibles
          {drivers.length > 0 && (
            <Badge variant="secondary" className="text-[9px]">{drivers.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : drivers.length === 0 ? (
          <div className="text-center py-4">
            <Users className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-[10px] text-muted-foreground">Aucun livreur disponible actuellement</p>
            <p className="text-[9px] text-muted-foreground">Un livreur sera automatiquement assigné</p>
          </div>
        ) : (
          <div className="space-y-2">
            {drivers.map((driver) => (
              <div key={driver.id} className="flex items-center gap-2.5 p-2 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {driver.profile?.avatar_url ? (
                    <img src={driver.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <Truck className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{driver.profile?.full_name || "Livreur"}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 text-accent fill-accent" />
                      {(driver.rating || 5).toFixed(1)}
                    </span>
                    <span>{vehicleLabels[driver.vehicle_type] || driver.vehicle_type}</span>
                    <span>{driver.total_deliveries || 0} courses</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {estimateTime(distanceKm)}
                  </p>
                  {driver.zone && (
                    <p className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      {driver.zone}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <p className="text-[9px] text-muted-foreground text-center">
              Le livreur le plus proche sera automatiquement assigné à votre commande
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AvailableDrivers;
