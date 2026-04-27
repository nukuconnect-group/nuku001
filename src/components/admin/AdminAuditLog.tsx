import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Coins, Crown, History, Download, ArrowUpDown, Search } from "lucide-react";

interface AuditEntry {
  id: string;
  admin_id: string;
  target_user_id: string | null;
  action: string;
  reason: string | null;
  details: any;
  created_at: string;
}

export default function AdminAuditLog({ targetUserId }: { targetUserId?: string }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    const load = async () => {
      let q = supabase
        .from("admin_audit_log" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (targetUserId) q = q.eq("target_user_id", targetUserId);
      const { data } = await q;
      setEntries((data as any[]) || []);
      setLoading(false);
    };
    load();
  }, [targetUserId]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let list = entries;
    if (s) {
      list = list.filter((e) => {
        const blob = `${e.action} ${e.reason ?? ""} ${e.target_user_id ?? ""} ${JSON.stringify(e.details ?? {})}`.toLowerCase();
        return blob.includes(s);
      });
    }
    list = [...list].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortDesc ? db - da : da - db;
    });
    return list;
  }, [entries, search, sortDesc]);

  const exportCsv = () => {
    const headers = ["date", "action", "admin_id", "target_user_id", "reason", "details"];
    const escape = (v: any) => {
      const s = v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const rows = filtered.map((e) =>
      [
        new Date(e.created_at).toISOString(),
        e.action,
        e.admin_id,
        e.target_user_id ?? "",
        e.reason ?? "",
        e.details ?? {},
      ]
        .map(escape)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-admin-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading)
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-4">
        <Loader2 className="w-3 h-3 animate-spin" /> Chargement…
      </div>
    );

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Journal d'audit admin
            </CardTitle>
            <CardDescription className="text-[11px]">
              {filtered.length} action{filtered.length > 1 ? "s" : ""} • triées par date
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1"
              onClick={() => setSortDesc((s) => !s)}
            >
              <ArrowUpDown className="w-3 h-3" /> {sortDesc ? "Récent" : "Ancien"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1"
              onClick={exportCsv}
              disabled={filtered.length === 0}
            >
              <Download className="w-3 h-3" /> CSV
            </Button>
          </div>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Rechercher action, raison, utilisateur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 text-xs"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            <History className="w-6 h-6 mx-auto mb-2 opacity-40" /> Aucun résultat.
          </div>
        ) : (
          <ScrollArea className="h-[420px]">
            <div className="divide-y divide-border">
              {filtered.map((e) => {
                const isCredit = e.action === "credit_tokens";
                const Icon = isCredit ? Coins : Crown;
                return (
                  <div key={e.id} className="p-3 hover:bg-muted/30">
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCredit ? "bg-amber-500/15 text-amber-600" : "bg-primary/15 text-primary"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold capitalize">{e.action.replace(/_/g, " ")}</p>
                          {isCredit && e.details?.amount && (
                            <Badge variant="outline" className="text-[9px] h-4">
                              +{e.details.amount} jetons
                            </Badge>
                          )}
                          {!isCredit && e.details?.plan && (
                            <Badge className="text-[9px] h-4 bg-primary/15 text-primary capitalize">
                              {e.details.plan}
                            </Badge>
                          )}
                        </div>
                        {e.reason && <p className="text-[10px] text-muted-foreground italic">« {e.reason} »</p>}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(e.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                          {e.details?.expires_at && (
                            <> • Expire {new Date(e.details.expires_at).toLocaleDateString("fr-FR")}</>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
