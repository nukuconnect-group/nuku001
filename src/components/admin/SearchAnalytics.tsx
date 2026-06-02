import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Mic, Camera, QrCode, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

type Range = "day" | "week" | "month" | "year";

interface SearchRow {
  id: string;
  user_id: string | null;
  session_id: string | null;
  query: string;
  mode: "text" | "voice" | "image" | "qr";
  category: string | null;
  result_count: number;
  page_path: string | null;
  created_at: string;
}

const RANGE_DAYS: Record<Range, number> = { day: 1, week: 7, month: 30, year: 365 };
const MODE_LABELS: Record<string, string> = {
  text: "Texte",
  voice: "Vocal",
  image: "Image",
  qr: "QR code",
};
const MODE_COLORS: Record<string, string> = {
  text: "hsl(var(--primary))",
  voice: "hsl(var(--accent))",
  image: "hsl(var(--secondary))",
  qr: "hsl(var(--muted-foreground))",
};

export default function SearchAnalytics() {
  const [range, setRange] = useState<Range>("week");

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - RANGE_DAYS[range]);
    return d.toISOString();
  }, [range]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["search-analytics", range],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("search_queries" as any)
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data || []) as unknown as SearchRow[];
    },
    staleTime: 60_000,
  });

  const totals = useMemo(() => {
    const byMode: Record<string, number> = { text: 0, voice: 0, image: 0, qr: 0 };
    const usersByMode: Record<string, Set<string>> = { text: new Set(), voice: new Set(), image: new Set(), qr: new Set() };
    const keywordMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    const noResults = new Map<string, number>();
    const dayMap = new Map<string, number>();

    for (const r of rows) {
      byMode[r.mode] = (byMode[r.mode] || 0) + 1;
      const u = r.user_id || r.session_id || "anon";
      usersByMode[r.mode]?.add(u);
      const k = r.query.trim().toLowerCase();
      if (k) keywordMap.set(k, (keywordMap.get(k) || 0) + 1);
      if (r.category) categoryMap.set(r.category, (categoryMap.get(r.category) || 0) + 1);
      if ((r.result_count ?? 0) === 0 && k) noResults.set(k, (noResults.get(k) || 0) + 1);
      const day = r.created_at.slice(0, 10);
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    }

    const sortDesc = (m: Map<string, number>) =>
      Array.from(m.entries()).sort((a, b) => b[1] - a[1]);

    return {
      total: rows.length,
      byMode,
      uniqueUsersByMode: Object.fromEntries(
        Object.entries(usersByMode).map(([k, s]) => [k, s.size])
      ) as Record<string, number>,
      topKeywords: sortDesc(keywordMap).slice(0, 15),
      topCategories: sortDesc(categoryMap).slice(0, 10),
      noResults: sortDesc(noResults).slice(0, 15),
      perDay: Array.from(dayMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date: date.slice(5), count })),
    };
  }, [rows]);

  const modeData = (["text", "voice", "image", "qr"] as const).map((m) => ({
    name: MODE_LABELS[m],
    value: totals.byMode[m] || 0,
    color: MODE_COLORS[m],
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              Analyse des recherches
            </CardTitle>
            <CardDescription className="text-xs">
              Mots-clés, modes (texte/vocal/image/QR), catégories, recherches sans résultat.
            </CardDescription>
          </div>
          <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
            <TabsList className="h-8">
              <TabsTrigger value="day" className="text-[11px] h-6">Jour</TabsTrigger>
              <TabsTrigger value="week" className="text-[11px] h-6">Semaine</TabsTrigger>
              <TabsTrigger value="month" className="text-[11px] h-6">Mois</TabsTrigger>
              <TabsTrigger value="year" className="text-[11px] h-6">Année</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <KpiCard icon={<TrendingUp className="w-3.5 h-3.5" />} label="Total" value={totals.total} />
            <KpiCard icon={<Search className="w-3.5 h-3.5" />} label="Texte" value={totals.byMode.text} sub={`${totals.uniqueUsersByMode.text} utilisateurs`} />
            <KpiCard icon={<Mic className="w-3.5 h-3.5" />} label="Vocal" value={totals.byMode.voice} sub={`${totals.uniqueUsersByMode.voice} utilisateurs`} />
            <KpiCard icon={<Camera className="w-3.5 h-3.5" />} label="Image" value={totals.byMode.image} sub={`${totals.uniqueUsersByMode.image} utilisateurs`} />
            <KpiCard icon={<QrCode className="w-3.5 h-3.5" />} label="QR" value={totals.byMode.qr} sub={`${totals.uniqueUsersByMode.qr} utilisateurs`} />
          </div>

          {/* Trend chart */}
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium mb-2">Volume par jour</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={totals.perDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Mode pie */}
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium mb-2">Répartition par mode</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={modeData} dataKey="value" nameKey="name" outerRadius={70} label={(e) => `${e.name}: ${e.value}`}>
                      {modeData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Categories bar */}
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium mb-2">Recherches par catégorie</p>
              <div className="h-56">
                {totals.topCategories.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-12">Aucune donnée pour cette période</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={totals.topCategories.map(([name, value]) => ({ name, value }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={90} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                      <Bar dataKey="value" fill="hsl(var(--accent))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Top keywords */}
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium mb-2">Mots-clés les plus recherchés</p>
              {totals.topKeywords.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucune recherche pour cette période</p>
              ) : (
                <ul className="space-y-1">
                  {totals.topKeywords.map(([kw, count]) => (
                    <li key={kw} className="flex items-center justify-between text-xs border-b border-border/40 pb-1 last:border-0">
                      <span className="truncate">{kw}</span>
                      <Badge variant="secondary" className="text-[10px]">{count}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* No results */}
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                Recherches sans résultat (opportunités)
              </p>
              {totals.noResults.length === 0 ? (
                <p className="text-xs text-muted-foreground">Toutes les recherches ont des résultats 🎉</p>
              ) : (
                <ul className="space-y-1">
                  {totals.noResults.map(([kw, count]) => (
                    <li key={kw} className="flex items-center justify-between text-xs border-b border-border/40 pb-1 last:border-0">
                      <span className="truncate">{kw}</span>
                      <Badge variant="destructive" className="text-[10px]">{count}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-lg border border-border p-2.5 bg-muted/30">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-lg font-bold text-foreground leading-tight mt-0.5">{value.toLocaleString()}</p>
      {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
    </div>
  );
}
