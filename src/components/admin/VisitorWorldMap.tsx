import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, MapPin } from "lucide-react";

// Country coordinates (lat, lng) for common African & global countries
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

  // SVG world map simplified - focus on Africa + relevant regions
  // Using a simple mercator-like projection
  const projectToSvg = (lat: number, lng: number): { x: number; y: number } => {
    const x = ((lng + 180) / 360) * 800;
    const latRad = (lat * Math.PI) / 180;
    const mercY = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    const y = 250 - (mercY / Math.PI) * 250;
    return { x, y };
  };

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
            {/* SVG Map */}
            <div className="relative bg-muted/30 rounded-xl overflow-hidden border border-border">
              <svg viewBox="0 0 800 500" className="w-full h-auto" style={{ minHeight: 200 }}>
                {/* Background */}
                <rect width="800" height="500" fill="hsl(var(--muted))" opacity="0.2" />
                
                {/* Grid lines */}
                {[-60, -30, 0, 30, 60].map(lat => {
                  const { y } = projectToSvg(lat, 0);
                  return <line key={`lat-${lat}`} x1="0" y1={y} x2="800" y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4,4" />;
                })}
                {[-120, -60, 0, 60, 120].map(lng => {
                  const { x } = projectToSvg(0, lng);
                  return <line key={`lng-${lng}`} x1={x} y1="0" x2={x} y2="500" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4,4" />;
                })}

                {/* Simplified continent outlines - Africa focus */}
                <ellipse cx="420" cy="270" rx="60" ry="100" fill="hsl(var(--primary))" opacity="0.06" stroke="hsl(var(--primary))" strokeWidth="0.5" />
                <ellipse cx="440" cy="140" rx="80" ry="50" fill="hsl(var(--primary))" opacity="0.04" />
                <ellipse cx="280" cy="200" rx="100" ry="60" fill="hsl(var(--primary))" opacity="0.04" />
                <ellipse cx="600" cy="220" rx="80" ry="70" fill="hsl(var(--primary))" opacity="0.04" />

                {/* Country markers */}
                {countryData.map((c, i) => {
                  const coords = COUNTRY_COORDS[c.country];
                  if (!coords) return null;
                  const { x, y } = projectToSvg(coords.lat, coords.lng);
                  const size = Math.max(8, Math.min(30, (c.count / maxCount) * 30));
                  const opacity = 0.4 + (c.count / maxCount) * 0.6;

                  return (
                    <g key={i}>
                      {/* Pulse ring */}
                      <circle cx={x} cy={y} r={size + 4} fill="hsl(var(--primary))" opacity={opacity * 0.15}>
                        <animate attributeName="r" from={size + 2} to={size + 10} dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from={opacity * 0.2} to="0" dur="2s" repeatCount="indefinite" />
                      </circle>
                      {/* Main dot */}
                      <circle cx={x} cy={y} r={size / 2} fill="hsl(var(--primary))" opacity={opacity} stroke="hsl(var(--primary-foreground))" strokeWidth="1.5" />
                      {/* Count label */}
                      <text x={x} y={y + size / 2 + 12} textAnchor="middle" fontSize="9" fill="hsl(var(--foreground))" fontWeight="600">
                        {c.country}
                      </text>
                      <text x={x} y={y - size / 2 - 5} textAnchor="middle" fontSize="8" fill="hsl(var(--primary))" fontWeight="bold">
                        {c.count}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Country list with bars */}
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
