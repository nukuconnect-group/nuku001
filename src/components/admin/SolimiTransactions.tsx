import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Search, Wallet } from "lucide-react";

export default function SolimiTransactions() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("solimi_transactions" as any).select("*").order("created_at", { ascending: false }).limit(200);
    if (status !== "all") q = q.eq("status", status);
    const { data } = await q;
    setItems((data as any[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [status]);

  const filtered = useMemo(() => {
    const s = query.toLowerCase().trim();
    if (!s) return items;
    return items.filter((t) => [t.payment_id, t.customer_email, t.context, t.status, JSON.stringify(t.context_data || {})].join(" ").toLowerCase().includes(s));
  }, [items, query]);

  const badge = (s: string) => s === "success" ? "default" : s === "failed" || s === "cancelled" ? "destructive" : "outline";

  return <Card><CardHeader className="p-3 sm:p-4 pb-2"><div className="flex flex-col sm:flex-row sm:items-center gap-2"><div className="flex-1"><CardTitle className="text-sm flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" />Transactions SOLIMI</CardTitle><CardDescription className="text-[11px]">Recherche par utilisateur, plan, jetons, commande ou statut</CardDescription></div><div className="relative sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher…" className="pl-9 h-8 text-xs" /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="h-8 text-xs sm:w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="success">Success</SelectItem><SelectItem value="failed">Failed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select><Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-8 text-xs">{loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}</Button></div></CardHeader><CardContent className="p-3 sm:p-4 pt-0"><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b"><th className="text-left py-2">Référence</th><th className="text-left py-2">Contexte</th><th className="text-left py-2">Client</th><th className="text-right py-2">Montant</th><th className="text-center py-2">Statut</th><th className="text-left py-2">Date</th></tr></thead><tbody>{filtered.map((t) => <tr key={t.id} className="border-b border-border/50"><td className="py-2 font-mono max-w-36 truncate">{t.payment_id}</td><td className="py-2">{t.context}</td><td className="py-2 max-w-44 truncate">{t.customer_email || t.user_id}</td><td className="py-2 text-right">{Number(t.amount || 0).toLocaleString("fr-FR")} {t.currency}</td><td className="py-2 text-center"><Badge variant={badge(t.status) as any} className="text-[9px]">{t.status}</Badge></td><td className="py-2 text-muted-foreground">{new Date(t.created_at).toLocaleString("fr-FR")}</td></tr>)}</tbody></table>{!loading && filtered.length === 0 && <p className="text-center text-muted-foreground text-xs py-8">Aucune transaction</p>}</div></CardContent></Card>;
}
