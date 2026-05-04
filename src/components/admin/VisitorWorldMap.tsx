import { useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Globe, Radio } from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, Tooltip, LayersControl, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";

const COUNTRY_COORDS: Record<string, { lat: number; lng: number; flag: string }> = {
  "Togo": { lat: 8.6, lng: 1.2, flag: "🇹🇬" },
  "Ghana": { lat: 7.9, lng: -1.0, flag: "🇬🇭" },
  "Bénin": { lat: 9.3, lng: 2.3, flag: "🇧🇯" },
  "Benin": { lat: 9.3, lng: 2.3, flag: "🇧🇯" },
  "Côte d'Ivoire": { lat: 7.5, lng: -5.5, flag: "🇨🇮" },
  "Ivory Coast": { lat: 7.5, lng: -5.5, flag: "🇨🇮" },
  "Nigeria": { lat: 9.1, lng: 8.7, flag: "🇳🇬" },
  "Sénégal": { lat: 14.5, lng: -14.5, flag: "🇸🇳" },
  "Senegal": { lat: 14.5, lng: -14.5, flag: "🇸🇳" },
  "Mali": { lat: 17.6, lng: -4.0, flag: "🇲🇱" },
  "Burkina Faso": { lat: 12.4, lng: -1.6, flag: "🇧🇫" },
  "Niger": { lat: 17.6, lng: 8.1, flag: "🇳🇪" },
  "Cameroun": { lat: 7.4, lng: 12.4, flag: "🇨🇲" },
  "Cameroon": { lat: 7.4, lng: 12.4, flag: "🇨🇲" },
  "France": { lat: 46.2, lng: 2.2, flag: "🇫🇷" },
  "United States": { lat: 37.1, lng: -95.7, flag: "🇺🇸" },
  "USA": { lat: 37.1, lng: -95.7, flag: "🇺🇸" },
  "Germany": { lat: 51.2, lng: 10.5, flag: "🇩🇪" },
  "Allemagne": { lat: 51.2, lng: 10.5, flag: "🇩🇪" },
  "United Kingdom": { lat: 55.4, lng: -3.4, flag: "🇬🇧" },
  "UK": { lat: 55.4, lng: -3.4, flag: "🇬🇧" },
  "Canada": { lat: 56.1, lng: -106.3, flag: "🇨🇦" },
  "Belgium": { lat: 50.5, lng: 4.5, flag: "🇧🇪" },
  "Belgique": { lat: 50.5, lng: 4.5, flag: "🇧🇪" },
  "Switzerland": { lat: 46.8, lng: 8.2, flag: "🇨🇭" },
  "Suisse": { lat: 46.8, lng: 8.2, flag: "🇨🇭" },
  "China": { lat: 35.9, lng: 104.2, flag: "🇨🇳" },
  "Chine": { lat: 35.9, lng: 104.2, flag: "🇨🇳" },
  "India": { lat: 20.6, lng: 79.0, flag: "🇮🇳" },
  "Inde": { lat: 20.6, lng: 79.0, flag: "🇮🇳" },
  "Brazil": { lat: -14.2, lng: -51.9, flag: "🇧🇷" },
  "Brésil": { lat: -14.2, lng: -51.9, flag: "🇧🇷" },
  "South Africa": { lat: -30.6, lng: 22.9, flag: "🇿🇦" },
  "Afrique du Sud": { lat: -30.6, lng: 22.9, flag: "🇿🇦" },
  "Guinée": { lat: 9.9, lng: -9.7, flag: "🇬🇳" },
  "Guinea": { lat: 9.9, lng: -9.7, flag: "🇬🇳" },
  "Congo": { lat: -4.0, lng: 21.8, flag: "🇨🇩" },
  "RDC": { lat: -4.0, lng: 21.8, flag: "🇨🇩" },
  "Gabon": { lat: -0.8, lng: 11.6, flag: "🇬🇦" },
  "Mauritanie": { lat: 21.0, lng: -10.9, flag: "🇲🇷" },
};

interface CountryItem { country: string; visits?: number; count?: number; unique_visitors?: number }

interface VisitorWorldMapProps {
  countryData: CountryItem[];
  onLiveVisit?: (country: string | null) => void;
}

const VisitorWorldMap = ({ countryData, onLiveVisit }: VisitorWorldMapProps) => {
  const [livePulse, setLivePulse] = useState(false);
  const [lastLiveCountry, setLastLiveCountry] = useState<string | null>(null);
  const [liveCounter, setLiveCounter] = useState(0);

  const getVisits = (c: CountryItem) => Number(c.visits || c.count || 0);
  const totalVisits = useMemo(() => countryData.reduce((s, c) => s + getVisits(c), 0), [countryData]);
  const totalUniqueVisitors = useMemo(() => countryData.reduce((s, c) => s + Number(c.unique_visitors || 0), 0), [countryData]);
  const maxCount = useMemo(() => Math.max(...countryData.map(c => getVisits(c)), 1), [countryData]);

  const markers = useMemo(() =>
    countryData
      .filter(c => COUNTRY_COORDS[c.country])
      .map(c => ({
        ...c,
        visitCount: getVisits(c),
        coords: COUNTRY_COORDS[c.country],
        radius: Math.max(8, Math.min(30, (getVisits(c) / maxCount) * 30)),
      })),
    [countryData, maxCount]
  );

  // Realtime subscription — listen for new visits and trigger refresh + pulse
  useEffect(() => {
    const channel = supabase
      .channel("visitor-map-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analytics_visits" },
        (payload: any) => {
          const country = payload?.new?.country || null;
          setLastLiveCountry(country);
          setLiveCounter(c => c + 1);
          setLivePulse(true);
          setTimeout(() => setLivePulse(false), 1500);
          onLiveVisit?.(country);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [onLiveVisit]);

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          Carte des visiteurs
          <span className={`inline-flex items-center gap-1 ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full ${livePulse ? "bg-destructive/15 text-destructive animate-pulse" : "bg-primary/10 text-primary"}`}>
            <Radio className="w-2.5 h-2.5" /> LIVE
          </span>
        </CardTitle>
        <CardDescription className="text-[11px]">
          {countryData.length} pays • {totalVisits} visites • {totalUniqueVisitors} visiteurs uniques
          {liveCounter > 0 && (
            <span className="ml-1 text-primary">• +{liveCounter} en direct{lastLiveCountry ? ` (dernier: ${lastLiveCountry})` : ""}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        {countryData.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Les données apparaîtront après quelques visites</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-border relative" style={{ height: 450 }}>
              <MapContainer
                center={[15, 10]}
                zoom={2}
                minZoom={2}
                maxZoom={10}
                worldCopyJump={true}
                scrollWheelZoom={true}
                zoomControl={false}
                style={{ height: "100%", width: "100%", background: "hsl(var(--muted))" }}
                attributionControl={true}
              >
                <ZoomControl position="topright" />
                <LayersControl position="topleft">
                  <LayersControl.BaseLayer checked name="Détaillée (Voyager)">
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                      attribution='&copy; OpenStreetMap &copy; CARTO'
                      subdomains="abcd"
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Satellite">
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      attribution="Tiles &copy; Esri"
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Sombre">
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; OpenStreetMap &copy; CARTO'
                      subdomains="abcd"
                    />
                  </LayersControl.BaseLayer>
                </LayersControl>

                {markers.map((m, i) => {
                  const badgeIcon = L.divIcon({
                    className: "visitor-badge-icon",
                    html: `<div style="display:flex;align-items:center;gap:4px;background:hsl(var(--background));border:2px solid hsl(var(--primary));border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:700;color:hsl(var(--foreground));box-shadow:0 2px 8px rgba(0,0,0,0.15);white-space:nowrap;font-family:system-ui;">
                      <span style="font-size:13px;">${m.coords.flag}</span>
                      <span>${m.count}</span>
                    </div>`,
                    iconSize: [60, 24],
                    iconAnchor: [30, 12],
                  });
                  return (
                    <div key={i}>
                      <CircleMarker
                        center={[m.coords.lat, m.coords.lng]}
                        radius={m.radius}
                        pathOptions={{
                          fillColor: "hsl(var(--primary))",
                          fillOpacity: 0.35,
                          color: "hsl(var(--primary))",
                          weight: 2,
                        }}
                      />
                      <Marker position={[m.coords.lat, m.coords.lng]} icon={badgeIcon}>
                        <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                          <div className="font-sans text-xs">
                            <strong>{m.country}</strong> — {m.count} visites
                          </div>
                        </Tooltip>
                        <Popup>
                          <div className="text-center font-sans">
                            <span className="text-2xl">{m.coords.flag}</span>
                            <div className="font-semibold mt-1">{m.country}</div>
                            <div className="text-sm text-muted-foreground">{m.count} visites</div>
                            <div className="text-[11px] text-muted-foreground mt-1">
                              {totalVisits > 0 ? Math.round((m.count / totalVisits) * 100) : 0}% du total
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    </div>
                  );
                })}
              </MapContainer>

              <div className="absolute bottom-2 left-2 z-[1000] bg-background/95 backdrop-blur border border-border rounded-lg px-2.5 py-1.5 text-[10px] shadow-lg">
                <div className="font-semibold mb-1">Légende</div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary/40 border border-primary" />
                  <span className="text-muted-foreground">Cercle = volume</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="px-1 py-0.5 rounded-full border border-primary text-[9px] font-bold">12</span>
                  <span className="text-muted-foreground">Badge = nb visites</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {countryData.map((c, i) => {
                const pct = totalVisits > 0 ? Math.round((c.count / totalVisits) * 100) : 0;
                const coords = COUNTRY_COORDS[c.country];
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm flex-shrink-0">{coords?.flag || "🌍"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="font-medium truncate">{c.country}</span>
                        <span className="text-muted-foreground flex-shrink-0">{c.count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VisitorWorldMap;
