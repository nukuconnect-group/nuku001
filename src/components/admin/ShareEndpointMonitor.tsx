import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, AlertTriangle, CheckCircle2, Clock, ExternalLink, RefreshCw } from "lucide-react";
import { ListSkeleton } from "@/components/layout/SectionSkeletons";

type ShareLog = {
  id: string;
  endpoint: string;
  requested_type: string | null;
  requested_id: string | null;
  status_code: number;
  ok: boolean;
  resolved: boolean;
  duration_ms: number;
  title: string | null;
  description: string | null;
  image_url: string | null;
  canonical_url: string | null;
  error_message: string | null;
  user_agent: string | null;
  created_at: string;
};

const rangeToMs: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const formatMs = (value: number) => {
  if (!Number.isFinite(value)) return "—";
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(2)} s`;
};

const ShareEndpointMonitor = () => {
  const [range, setRange] = useState("7d");
  const [status, setStatus] = useState("all");

  const { data = [], isLoading, refetch, isFetching } = useQuery<ShareLog[]>({
    queryKey: ["admin-share-endpoint-logs", range],
    queryFn: async () => {
      const start = new Date(Date.now() - (rangeToMs[range] || rangeToMs["7d"])).toISOString();
      const { data, error } = await (supabase as any)
        .from("share_endpoint_logs")
        .select("id, endpoint, requested_type, requested_id, status_code, ok, resolved, duration_ms, title, description, image_url, canonical_url, error_message, user_agent, created_at")
        .gte("created_at", start)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data || []) as ShareLog[];
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
  });

  const filtered = useMemo(() => {
    if (status === "errors") return data.filter((row) => !row.ok || row.status_code >= 400);
    if (status === "fallbacks") return data.filter((row) => !row.resolved && row.ok);
    if (status === "success") return data.filter((row) => row.ok && row.resolved);
    return data;
  }, [data, status]);

  const stats = useMemo(() => {
    const total = data.length;
    const errors = data.filter((row) => !row.ok || row.status_code >= 400).length;
    const fallbacks = data.filter((row) => !row.resolved && row.ok).length;
    const avg = total ? Math.round(data.reduce((sum, row) => sum + Number(row.duration_ms || 0), 0) / total) : 0;
    const slow = data.filter((row) => Number(row.duration_ms || 0) > 1500).length;
    return { total, errors, fallbacks, avg, slow };
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Requêtes</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> OK</p>
            <p className="text-2xl font-bold text-emerald-600">{Math.max(0, stats.total - stats.errors)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-destructive" /> Erreurs</p>
            <p className="text-2xl font-bold text-destructive">{stats.errors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Fallbacks</p>
            <p className="text-2xl font-bold">{stats.fallbacks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Moyenne</p>
            <p className="text-2xl font-bold">{formatMs(stats.avg)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Monitoring partage social
              </CardTitle>
              <CardDescription className="text-[11px]">
                Temps de réponse et qualité des métadonnées pour /share et /share-og
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24h</SelectItem>
                  <SelectItem value="7d">7 jours</SelectItem>
                  <SelectItem value="30d">30 jours</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="success">Succès</SelectItem>
                  <SelectItem value="fallbacks">Fallbacks</SelectItem>
                  <SelectItem value="errors">Erreurs</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          {isLoading ? (
            <ListSkeleton count={6} />
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Aucun événement de partage pour ce filtre.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Statut</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Titre aperçu</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden md:table-cell">Image</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Temps</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-2">
                        <Badge variant={row.ok && row.status_code < 400 ? "default" : "destructive"} className="text-[9px]">
                          {row.ok && row.status_code < 400 ? (row.resolved ? "Succès" : "Fallback") : "Erreur"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2 text-muted-foreground">
                        {row.endpoint} · {row.requested_type || "—"}
                      </td>
                      <td className="py-2.5 px-2 min-w-[220px]">
                        <p className="font-medium truncate max-w-[360px]">{row.title || row.error_message || "Sans titre"}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[360px]">{row.requested_id || row.description || "—"}</p>
                      </td>
                      <td className="py-2.5 px-2 hidden md:table-cell">
                        {row.image_url ? (
                          <a href={row.image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            Image <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : "—"}
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium">{formatMs(row.duration_ms)}</td>
                      <td className="py-2.5 px-2 hidden lg:table-cell text-muted-foreground">
                        {new Date(row.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareEndpointMonitor;