import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Globe } from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, Tooltip, LayersControl, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

interface VisitorWorldMapProps {
  countryData: { country: string; count: number }[];
}

const VisitorWorldMap = ({ countryData }: VisitorWorldMapProps) => {
  const totalVisits = useMemo(() => countryData.reduce((s, c) => s + c.count, 0), [countryData]);
  const maxCount = useMemo(() => Math.max(...countryData.map(c => c.count), 1), [countryData]);

  const markers = useMemo(() =>
    countryData
      .filter(c => COUNTRY_COORDS[c.country])
      .map(c => ({
        ...c,
        coords: COUNTRY_COORDS[c.country],
        radius: Math.max(8, Math.min(30, (c.count / maxCount) * 30)),
      })),
    [countryData, maxCount]
  );

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          Carte des visiteurs
        </CardTitle>
        <CardDescription className="text-[11px]">
          {countryData.length} pays • {totalVisits} visites totales
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        {countryData.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Les données apparaîtront après quelques visites</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-border" style={{ height: 350 }}>
              <MapContainer
                center={[8.6, 1.2]}
                zoom={3}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
                attributionControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {markers.map((m, i) => (
                  <CircleMarker
                    key={i}
                    center={[m.coords.lat, m.coords.lng]}
                    radius={m.radius}
                    pathOptions={{
                      fillColor: "#1a6b35",
                      fillOpacity: 0.6,
                      color: "#1a6b35",
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="text-center font-sans">
                        <span className="text-lg">{m.coords.flag}</span>
                        <div className="font-semibold">{m.country}</div>
                        <div className="text-sm text-muted-foreground">{m.count} visites</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
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
