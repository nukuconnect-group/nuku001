import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cookie, Check, X, Loader2, RefreshCw } from "lucide-react";

interface ConsentRow {
  id: string;
  user_id: string | null;
  session_id: string | null;
  consent: "accepted" | "ignored" | "rejected";
  user_agent: string | null;
  page_path: string | null;
  created_at: string;
}

const CookieConsentsManager = () => {
  const [rows, setRows] = useState<ConsentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("cookie_consents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error) setRows((data as ConsentRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const accepted = rows.filter((r) => r.consent === "accepted").length;
  const ignored = rows.filter((r) => r.consent !== "accepted").length;
  const rate = rows.length ? Math.round((accepted / rows.length) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Cookie className="w-5 h-5 text-primary" />
            Consentements aux cookies
          </CardTitle>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5 h-8 text-xs">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Rafraîchir
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className="text-base font-bold text-foreground">{rows.length}</p>
          </div>
          <div className="rounded-lg border border-border p-2 text-center bg-primary/5">
            <p className="text-[10px] text-muted-foreground">Acceptés</p>
            <p className="text-base font-bold text-primary">{accepted}</p>
          </div>
          <div className="rounded-lg border border-border p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Taux</p>
            <p className="text-base font-bold text-foreground">{rate}%</p>
          </div>
        </div>

        {/* Detailed list */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-6">Aucun consentement enregistré pour le moment.</p>
        ) : (
          <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-start gap-2 p-2 rounded-md border border-border hover:bg-muted/40 transition"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {r.consent === "accepted" ? (
                    <Badge variant="default" className="gap-1 text-[9px] px-1.5 py-0">
                      <Check className="w-2.5 h-2.5" /> OK
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-[9px] px-1.5 py-0">
                      <X className="w-2.5 h-2.5" /> Ignoré
                    </Badge>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-foreground truncate">
                    {r.user_id ? `Utilisateur ${r.user_id.slice(0, 8)}…` : `Anonyme ${r.session_id?.slice(0, 8) || "?"}…`}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {r.page_path || "—"} • {new Date(r.created_at).toLocaleString("fr-FR")}
                  </p>
                  {r.user_agent && (
                    <p className="text-[9px] text-muted-foreground truncate italic">{r.user_agent}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CookieConsentsManager;
