import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Clock, Truck, Package, CheckCircle2, Navigation, Phone, Star, Share2 } from "lucide-react";
import SEO from "@/components/SEO";
import { toast } from "@/hooks/use-toast";

interface PublicTracking {
  id: string;
  status: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_address: string | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  dropoff_address: string | null;
  driver_current_lat: number | null;
  driver_current_lng: number | null;
  distance_km: number | null;
  estimated_minutes: number | null;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  driver_name: string | null;
  driver_avatar: string | null;
  driver_vehicle: string | null;
  driver_rating: number | null;
}

const STATUS_INFO: Record<string, { label: string; color: string; step: number }> = {
  pending: { label: "En attente d'un livreur", color: "bg-amber-500", step: 0 },
  accepted: { label: "Livreur en route vers le vendeur", color: "bg-blue-500", step: 1 },
  picking: { label: "Arrivée chez le vendeur", color: "bg-blue-500", step: 1 },
  picked_up: { label: "Colis récupéré", color: "bg-indigo-500", step: 2 },
  in_transit: { label: "En route vers vous", color: "bg-primary", step: 3 },
  delivered: { label: "Livré", color: "bg-emerald-500", step: 4 },
  cancelled: { label: "Annulée", color: "bg-destructive", step: 0 },
};

const PublicDeliveryTracking = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicTracking | null>(null);
  const [trace, setTrace] = useState<Array<[number, number]>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const traceLineRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);

  // Initial fetch
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const fetchData = async () => {
      try {
        const [trackingRes, traceRes] = await Promise.all([
          supabase.rpc("get_public_delivery_tracking" as any, { p_token: token }),
          supabase.rpc("get_public_delivery_trace" as any, { p_token: token }),
        ]);

        if (cancelled) return;

        if (trackingRes.error || !trackingRes.data) {
          setError("Lien de suivi invalide ou expiré.");
        } else {
          setData(trackingRes.data as PublicTracking);
        }
        if (!traceRes.error && Array.isArray(traceRes.data)) {
          setTrace((traceRes.data as any[]).map((p) => [Number(p.lat), Number(p.lng)] as [number, number]));
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Impossible de charger le suivi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    // Refresh every 8s as fallback (in addition to realtime)
    const interval = setInterval(fetchData, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  // Realtime subscription on the delivery row
  useEffect(() => {
    if (!data?.id) return;
    const channel = supabase
      .channel(`public-tracking-${data.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "deliveries", filter: `id=eq.${data.id}` },
        (payload: any) => {
          setData((prev) => (prev ? { ...prev, ...payload.new } : prev));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "delivery_track_points", filter: `delivery_id=eq.${data.id}` },
        (payload: any) => {
          const p = payload.new;
          setTrace((prev) => [...prev, [Number(p.lat), Number(p.lng)]]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [data?.id]);

  // Initialize the map once data is loaded
  useEffect(() => {
    if (!mapRef.current || !data) return;
    let cancelled = false;

    const init = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      leafletRef.current = L;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (cancelled || !mapRef.current) return;

      const center: [number, number] =
        data.driver_current_lat && data.driver_current_lng
          ? [Number(data.driver_current_lat), Number(data.driver_current_lng)]
          : data.dropoff_lat && data.dropoff_lng
          ? [Number(data.dropoff_lat), Number(data.dropoff_lng)]
          : [6.1725, 1.2314];

      const map = L.map(mapRef.current, {
        center,
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

      // Pickup marker
      if (data.pickup_lat && data.pickup_lng) {
        const ico = L.divIcon({
          className: "custom-marker",
          html: `<div style="background:#ef4444;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 8px rgba(239,68,68,0.4);display:flex;align-items:center;justify-content:center"><div style="transform:rotate(45deg);font-size:13px">📦</div></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });
        L.marker([Number(data.pickup_lat), Number(data.pickup_lng)], { icon: ico })
          .addTo(map)
          .bindPopup(`<b>Point de collecte</b><br/>${data.pickup_address || ""}`);
      }

      // Dropoff marker
      if (data.dropoff_lat && data.dropoff_lng) {
        const ico = L.divIcon({
          className: "custom-marker",
          html: `<div style="background:#22c55e;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 8px rgba(34,197,94,0.4);display:flex;align-items:center;justify-content:center"><div style="transform:rotate(45deg);font-size:13px">🏠</div></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });
        L.marker([Number(data.dropoff_lat), Number(data.dropoff_lng)], { icon: ico })
          .addTo(map)
          .bindPopup(`<b>Adresse de livraison</b><br/>${data.dropoff_address || ""}`);
      }

      // Driver marker
      if (data.driver_current_lat && data.driver_current_lng) {
        const driverIcon = L.divIcon({
          className: "custom-marker",
          html: `<div style="position:relative">
            <div style="position:absolute;width:48px;height:48px;border-radius:50%;background:hsla(217,91%,60%,0.2);top:-4px;left:-4px;animation:pulse-tracking 2s infinite"></div>
            <div style="background:hsl(217,91%,60%);width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 12px hsla(217,91%,60%,0.5);position:relative;z-index:2;font-size:18px">🛵</div>
          </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
        driverMarkerRef.current = L.marker(
          [Number(data.driver_current_lat), Number(data.driver_current_lng)],
          { icon: driverIcon, zIndexOffset: 1000 }
        ).addTo(map);
      }

      // Trace polyline
      if (trace.length >= 2) {
        traceLineRef.current = L.polyline(trace, { color: "hsl(142, 71%, 45%)", weight: 4, opacity: 0.7 }).addTo(map);
      }

      // Fit bounds
      const bounds = L.latLngBounds([]);
      if (data.pickup_lat && data.pickup_lng) bounds.extend([Number(data.pickup_lat), Number(data.pickup_lng)]);
      if (data.dropoff_lat && data.dropoff_lng) bounds.extend([Number(data.dropoff_lat), Number(data.dropoff_lng)]);
      if (data.driver_current_lat && data.driver_current_lng)
        bounds.extend([Number(data.driver_current_lat), Number(data.driver_current_lng)]);
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });

      mapInstanceRef.current = map;

      if (!document.getElementById("public-tracking-pulse")) {
        const style = document.createElement("style");
        style.id = "public-tracking-pulse";
        style.textContent = `@keyframes pulse-tracking{0%{transform:scale(1);opacity:0.6}50%{transform:scale(1.5);opacity:0.1}100%{transform:scale(1);opacity:0.6}}`;
        document.head.appendChild(style);
      }

      setTimeout(() => map.invalidateSize(), 200);
    };

    init();
    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // Only re-init when the delivery id changes (not on every position tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  // Live update of driver marker
  useEffect(() => {
    if (!driverMarkerRef.current || !data?.driver_current_lat || !data?.driver_current_lng) return;
    driverMarkerRef.current.setLatLng([Number(data.driver_current_lat), Number(data.driver_current_lng)]);
  }, [data?.driver_current_lat, data?.driver_current_lng]);

  // Update trace polyline
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    if (traceLineRef.current) {
      mapInstanceRef.current.removeLayer(traceLineRef.current);
    }
    if (trace.length >= 2) {
      traceLineRef.current = L.polyline(trace, { color: "hsl(142, 71%, 45%)", weight: 4, opacity: 0.7 }).addTo(mapInstanceRef.current);
    }
  }, [trace]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Suivi de livraison Nukuconnect", url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Lien copié", description: "Le lien de suivi est dans votre presse-papier." });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Chargement du suivi…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-3">
            <MapPin className="w-10 h-10 mx-auto text-muted-foreground" />
            <h1 className="text-lg font-bold">Suivi indisponible</h1>
            <p className="text-sm text-muted-foreground">{error || "Cette livraison est introuvable."}</p>
            <Link to="/"><Button variant="outline" size="sm">Retour à l'accueil</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = STATUS_INFO[data.status] || STATUS_INFO.pending;
  const isFinished = data.status === "delivered";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Suivi livraison Nukuconnect"
        description="Suivez votre livraison Nukuconnect en temps réel sur la carte."
      />

      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-20">
        <div className="container mx-auto px-3 py-2.5 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-white text-xs font-bold">N</div>
            <span className="text-sm font-bold">Nukuconnect</span>
          </Link>
          <Badge className={`${status.color} text-white text-[10px] gap-1 border-0`}>
            <Truck className="w-3 h-3" />
            {status.label}
          </Badge>
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={handleShare}>
            <Share2 className="w-3.5 h-3.5" /> Partager
          </Button>
        </div>
      </header>

      {/* Map */}
      <div className="relative flex-1 min-h-[55vh]">
        <div ref={mapRef} className="absolute inset-0" />
      </div>

      {/* Bottom info card */}
      <div className="bg-background border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="container mx-auto px-3 py-3 space-y-3 max-w-2xl">
          {/* Steps progress */}
          <div className="flex items-center gap-1">
            {["Accepté", "Collecté", "En transit", "Livré"].map((label, idx) => {
              const active = status.step >= idx + 1;
              return (
                <div key={label} className="flex-1 flex items-center gap-1">
                  <div className={`flex-1 h-1.5 rounded-full ${active ? "bg-primary" : "bg-muted"}`} />
                  {idx < 3 && <span className={`text-[8px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>•</span>}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground -mt-1">
            <span>Accepté</span><span>Collecté</span><span>En transit</span><span>Livré</span>
          </div>

          {/* Driver card */}
          {data.driver_name && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {data.driver_avatar ? (
                  <img src={data.driver_avatar} alt={data.driver_name} className="w-full h-full object-cover" />
                ) : (
                  <Truck className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{data.driver_name}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  {data.driver_vehicle && <span className="capitalize">{data.driver_vehicle}</span>}
                  {data.driver_rating != null && (
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      {Number(data.driver_rating).toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ETA / distance */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-muted/40 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                <Clock className="w-3 h-3" /> Temps estimé
              </div>
              <p className="text-sm font-bold">
                {isFinished ? "Livré ✓" : data.estimated_minutes ? `${data.estimated_minutes} min` : "—"}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/40 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                <Navigation className="w-3 h-3" /> Distance
              </div>
              <p className="text-sm font-bold">
                {data.distance_km ? `${Number(data.distance_km).toFixed(1)} km` : "—"}
              </p>
            </div>
          </div>

          {data.dropoff_address && (
            <div className="flex items-start gap-2 text-xs">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground"><span className="font-medium text-foreground">Livraison à :</span> {data.dropoff_address}</span>
            </div>
          )}

          <p className="text-[10px] text-center text-muted-foreground pt-2 border-t border-border">
            🔒 Suivi public sécurisé — actualisé en temps réel
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicDeliveryTracking;
