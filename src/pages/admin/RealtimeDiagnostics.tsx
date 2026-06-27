import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getClientDiag,
  clearClientDiag,
  type ClientDiagEntry,
  type ClientDiagSource,
} from "@/lib/clientDiagnostics";
import { getRealtimeStatusSnapshot, type RealtimeStatus } from "@/hooks/useProductPriceTiers";

const SOURCES: (ClientDiagSource | "all")[] = ["all", "realtime", "chunk", "price-tiers", "home", "share-og", "generic"];

const statusBadge = (s: RealtimeStatus) => {
  const map: Record<RealtimeStatus, string> = {
    disabled: "bg-muted text-muted-foreground",
    connecting: "bg-amber-500/15 text-amber-700 border border-amber-500/30",
    connected: "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30",
    error: "bg-destructive/15 text-destructive border border-destructive/30",
  };
  return map[s];
};

export default function RealtimeDiagnostics() {
  const [entries, setEntries] = useState<ClientDiagEntry[]>([]);
  const [filter, setFilter] = useState<ClientDiagSource | "all">("all");
  const [mobileOnly, setMobileOnly] = useState(false);
  const [rtSnapshot, setRtSnapshot] = useState(getRealtimeStatusSnapshot());

  useEffect(() => {
    const refresh = () => {
      setEntries(getClientDiag({ mobileOnly }).reverse());
      setRtSnapshot(getRealtimeStatusSnapshot());
    };
    refresh();
    const onEvt = () => refresh();
    window.addEventListener("nuku:client-diag", onEvt);
    window.addEventListener("nuku:client-diag-clear", onEvt);
    const t = setInterval(refresh, 3000);
    return () => {
      window.removeEventListener("nuku:client-diag", onEvt);
      window.removeEventListener("nuku:client-diag-clear", onEvt);
      clearInterval(t);
    };
  }, [mobileOnly]);

  const visible = filter === "all" ? entries : entries.filter((e) => e.source === filter);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
      <Helmet>
        <title>Diagnostics temps réel — Admin Nukuconnect</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Diagnostics temps réel</h1>
        <p className="text-sm text-muted-foreground">
          Erreurs Realtime, ChunkLoadError et chargement des prix paliers, suivies en direct côté client.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Statut Realtime des prix paliers</CardTitle>
          <Badge variant="secondary">{rtSnapshot.length} carte(s) suivie(s)</Badge>
        </CardHeader>
        <CardContent>
          {rtSnapshot.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune carte produit n'a actuellement de canal Realtime actif (désactivé par défaut sur mobile).
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {rtSnapshot.map(({ productId, status }) => (
                <li key={productId} className="flex items-center justify-between rounded-md border border-border p-2 text-xs">
                  <code className="truncate">{productId}</code>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge(status)}`}>
                    {status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Journal d'erreurs ({visible.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as ClientDiagSource | "all")}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={mobileOnly} onChange={(e) => setMobileOnly(e.target.checked)} />
              Mobile uniquement
            </label>
            <Button size="sm" variant="outline" onClick={() => clearClientDiag()}>
              Vider
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune erreur enregistrée.</p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((e) => (
                <li key={e.id} className="py-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(e.ts).toLocaleString()}
                    </span>
                    <Badge variant={e.level === "error" ? "destructive" : "secondary"}>{e.level}</Badge>
                    <Badge variant="outline">{e.source}</Badge>
                    {e.isMobile && <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30">mobile</Badge>}
                  </div>
                  <div className="mt-1 font-medium text-foreground break-words">{e.message}</div>
                  {e.meta && (
                    <pre className="mt-1 overflow-x-auto rounded bg-muted/40 p-2 text-[10px] text-muted-foreground">
{JSON.stringify(e.meta, null, 2)}
                    </pre>
                  )}
                  <div className="text-[10px] text-muted-foreground truncate">{e.url}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
