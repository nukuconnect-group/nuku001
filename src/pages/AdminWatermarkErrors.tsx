import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";

interface ErrorRow {
  id: string;
  source_url: string | null;
  error_kind: string;
  error_message: string | null;
  upstream_status: number | null;
  duration_ms: number | null;
  created_at: string;
}

const kindColor: Record<string, string> = {
  invalid_url: "bg-amber-500",
  upstream_error: "bg-orange-500",
  magick_failure: "bg-destructive",
};

const AdminWatermarkErrors = () => {
  const { toast } = useToast();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<ErrorRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthChecked(true);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
      setAuthChecked(true);
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("watermark_error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setRows(data as ErrorRow[]);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (!authChecked) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto p-6 space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  const total = rows?.length ?? 0;
  const byKind = rows?.reduce<Record<string, number>>((acc, r) => {
    acc[r.error_kind] = (acc[r.error_kind] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              Erreurs filigrane (watermark-image)
            </h1>
            <p className="text-sm text-muted-foreground">
              Les 200 dernières erreurs (URLs invalides, échecs ImageMagick, etc.).
            </p>
          </div>
          <Button onClick={load} disabled={loading} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Rafraîchir
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">Total récent</div>
              <div className="text-xl font-bold">{total}</div>
            </CardContent>
          </Card>
          {Object.entries(byKind).map(([k, v]) => (
            <Card key={k}>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground">{k}</div>
                <div className="text-xl font-bold">{v}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Détails</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading && !rows ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !rows || rows.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">
                Aucune erreur enregistrée 🎉
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-2">Date</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">URL source</th>
                      <th className="p-2">HTTP</th>
                      <th className="p-2">Durée</th>
                      <th className="p-2">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-t border-border/50">
                        <td className="p-2 whitespace-nowrap text-muted-foreground">
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                        <td className="p-2">
                          <Badge className={`${kindColor[r.error_kind] ?? "bg-muted"} text-white`}>
                            {r.error_kind}
                          </Badge>
                        </td>
                        <td className="p-2 max-w-xs truncate">
                          {r.source_url ? (
                            <a
                              href={r.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <span className="truncate">{r.source_url}</span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-2">{r.upstream_status ?? "—"}</td>
                        <td className="p-2">{r.duration_ms ? `${r.duration_ms}ms` : "—"}</td>
                        <td className="p-2 text-muted-foreground max-w-md truncate">
                          {r.error_message ?? "—"}
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
    </div>
  );
};

export default AdminWatermarkErrors;
