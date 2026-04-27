import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Coins, Crown, History, Download, ArrowUpDown, Search, ChevronDown, ChevronUp, User, Shield, Copy, Check } from "lucide-react";
import { toast } from "sonner";

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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      toast.success("Copié");
      setTimeout(() => setCopiedId((c) => (c === key ? null : c)), 1200);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const shortId = (id?: string | null) => (id ? `${id.slice(0, 8)}…${id.slice(-4)}` : "—");

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
    <Card className="w-full overflow-hidden">
      <CardHeader className="p-3 sm:p-4 pb-2 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">Journal d'audit admin</span>
            </CardTitle>
            <CardDescription className="text-[11px]">
              {filtered.length} action{filtered.length > 1 ? "s" : ""} • triées par date
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
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
        <div className="relative">
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
          <ScrollArea className="h-[460px] w-full">
            <div className="divide-y divide-border">
              {filtered.map((e) => {
                const isCredit = e.action === "credit_tokens";
                const Icon = isCredit ? Coins : Crown;
                const isOpen = !!expanded[e.id];
                const detailsStr = e.details ? JSON.stringify(e.details, null, 2) : "";
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-semibold capitalize break-words">
                            {e.action.replace(/_/g, " ")}
                          </p>
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

                        {e.reason && (
                          <p className="text-[10px] text-muted-foreground italic mt-0.5 break-words">
                            « {e.reason} »
                          </p>
                        )}

                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(e.created_at).toLocaleString("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                          {e.details?.expires_at && (
                            <> • Expire {new Date(e.details.expires_at).toLocaleDateString("fr-FR")}</>
                          )}
                        </p>

                        {/* Identifiants admin / cible — toujours visibles, responsive */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1.5">
                          <div className="flex items-center gap-1 min-w-0 text-[10px] text-muted-foreground">
                            <Shield className="w-3 h-3 shrink-0 text-primary/70" />
                            <span className="shrink-0">Admin:</span>
                            <code className="font-mono truncate">{shortId(e.admin_id)}</code>
                            <button
                              onClick={() => copy(e.admin_id, `${e.id}-a`)}
                              className="ml-auto p-0.5 hover:text-foreground shrink-0"
                              aria-label="Copier admin id"
                            >
                              {copiedId === `${e.id}-a` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-1 min-w-0 text-[10px] text-muted-foreground">
                            <User className="w-3 h-3 shrink-0 text-blue-500/70" />
                            <span className="shrink-0">Cible:</span>
                            <code className="font-mono truncate">{shortId(e.target_user_id)}</code>
                            {e.target_user_id && (
                              <button
                                onClick={() => copy(e.target_user_id!, `${e.id}-t`)}
                                className="ml-auto p-0.5 hover:text-foreground shrink-0"
                                aria-label="Copier user id"
                              >
                                {copiedId === `${e.id}-t` ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Détails JSON dépliables */}
                        {detailsStr && detailsStr !== "{}" && (
                          <div className="mt-1.5">
                            <button
                              onClick={() =>
                                setExpanded((prev) => ({ ...prev, [e.id]: !prev[e.id] }))
                              }
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                            >
                              {isOpen ? (
                                <>
                                  <ChevronUp className="w-3 h-3" /> Masquer les détails
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3" /> Voir les détails
                                </>
                              )}
                            </button>
                            {isOpen && (
                              <pre className="mt-1 p-2 bg-muted/50 rounded text-[10px] font-mono whitespace-pre-wrap break-words max-w-full overflow-x-auto">
                                {detailsStr}
                              </pre>
                            )}
                          </div>
                        )}
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
