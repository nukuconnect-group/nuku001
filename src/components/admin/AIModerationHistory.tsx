import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Search, CheckCircle2, XCircle, Clock, Bell, Loader2, Mail } from "lucide-react";

/**
 * Historique des décisions IA (moderation_logs) et notifications envoyées
 * aux fournisseurs. Permet à l'admin d'auditer la modération.
 */
export default function AIModerationHistory() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [emailLogs, setEmailLogs] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const [logsRes, emailRes] = await Promise.all([
      supabase
        .from("moderation_logs")
        .select("*, products(name, producer_id, profiles:producer_id(full_name, user_id))")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("email_send_log")
        .select("*")
        .in("template_name", ["product_approved", "product_rejected", "product_moderated"])
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    setLogs(logsRes.data || []);
    setEmailLogs(emailRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.products?.name?.toLowerCase().includes(s) ||
      l.products?.profiles?.full_name?.toLowerCase().includes(s) ||
      l.reason?.toLowerCase().includes(s) ||
      l.decision?.toLowerCase().includes(s)
    );
  });

  const decisionBadge = (decision: string) => {
    if (decision === "approved") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[9px] gap-1"><CheckCircle2 className="w-2.5 h-2.5" />Approuvé</Badge>;
    if (decision === "rejected") return <Badge className="bg-destructive/15 text-destructive text-[9px] gap-1"><XCircle className="w-2.5 h-2.5" />Rejeté</Badge>;
    return <Badge variant="outline" className="text-[9px] gap-1"><Clock className="w-2.5 h-2.5" />{decision}</Badge>;
  };

  const emailStatusBadge = (status: string) => {
    if (status === "sent") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[9px]">Envoyé ✓</Badge>;
    if (status === "pending") return <Badge className="bg-amber-500/15 text-amber-700 text-[9px]">En attente</Badge>;
    if (status === "dlq" || status === "failed") return <Badge className="bg-destructive/15 text-destructive text-[9px]">Échec</Badge>;
    return <Badge variant="outline" className="text-[9px]">{status}</Badge>;
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Historique modération IA
              </CardTitle>
              <CardDescription className="text-[11px]">{filtered.length} décisions</CardDescription>
            </div>
            <div className="relative sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Produit, fournisseur, raison…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
            </div>
            <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Actualiser"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground py-8">Aucune décision IA enregistrée</p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filtered.map((l) => (
                  <div key={l.id} className="border border-border rounded-lg p-2.5 bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{l.products?.name || "Produit supprimé"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          Fournisseur : {l.products?.profiles?.full_name || "—"} • Tentative #{l.attempt_number}
                        </p>
                      </div>
                      {decisionBadge(l.decision)}
                    </div>
                    {l.reason && <p className="text-[11px] text-foreground/90 mb-1">💬 {l.reason}</p>}
                    <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-muted-foreground">
                      {l.confidence != null && <span className="px-1.5 py-0.5 bg-background rounded">Confiance {Math.round(Number(l.confidence) * 100)}%</span>}
                      {l.content_safety && <span className="px-1.5 py-0.5 bg-background rounded">Sécurité : {l.content_safety}</span>}
                      {l.category_check && <span className="px-1.5 py-0.5 bg-background rounded">Catégorie : {l.category_check}</span>}
                      <span className="ml-auto">{new Date(l.created_at).toLocaleString("fr-FR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Notifications email aux fournisseurs (validation produit)
          </CardTitle>
          <CardDescription className="text-[11px]">{emailLogs.length} envois</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          {emailLogs.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground py-6">Aucun email de validation envoyé pour le moment.</p>
          ) : (
            <ScrollArea className="h-[260px]">
              <div className="space-y-1.5">
                {emailLogs.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded-md text-[11px]">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{e.recipient_email}</p>
                      <p className="text-[9px] text-muted-foreground truncate">
                        {e.template_name} • {new Date(e.created_at).toLocaleString("fr-FR")}
                        {e.error_message && <span className="text-destructive"> • {e.error_message}</span>}
                      </p>
                    </div>
                    {emailStatusBadge(e.status)}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
