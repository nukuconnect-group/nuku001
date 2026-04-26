import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Coins, Crown, History } from "lucide-react";

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

  useEffect(() => {
    const load = async () => {
      let q = supabase.from("admin_audit_log" as any).select("*").order("created_at", { ascending: false }).limit(100);
      if (targetUserId) q = q.eq("target_user_id", targetUserId);
      const { data } = await q;
      setEntries((data as any[]) || []);
      setLoading(false);
    };
    load();
  }, [targetUserId]);

  if (loading) return <div className="flex items-center gap-2 text-xs text-muted-foreground p-4"><Loader2 className="w-3 h-3 animate-spin" /> Chargement…</div>;

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-xs text-muted-foreground">
          <History className="w-6 h-6 mx-auto mb-2 opacity-40" /> Aucune action enregistrée.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4 text-primary" /> Journal d'audit admin</CardTitle>
        <CardDescription className="text-[11px]">Historique des attributions d'abonnement et crédits de jetons.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[420px]">
          <div className="divide-y divide-border">
            {entries.map((e) => {
              const isCredit = e.action === "credit_tokens";
              const Icon = isCredit ? Coins : Crown;
              return (
                <div key={e.id} className="p-3 hover:bg-muted/30">
                  <div className="flex items-start gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isCredit ? "bg-amber-500/15 text-amber-600" : "bg-primary/15 text-primary"}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold capitalize">{e.action.replace("_", " ")}</p>
                        {isCredit && e.details?.amount && <Badge variant="outline" className="text-[9px] h-4">+{e.details.amount} jetons</Badge>}
                        {!isCredit && e.details?.plan && <Badge className="text-[9px] h-4 bg-primary/15 text-primary capitalize">{e.details.plan}</Badge>}
                      </div>
                      {e.reason && <p className="text-[10px] text-muted-foreground italic">« {e.reason} »</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(e.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                        {e.details?.expires_at && <> • Expire {new Date(e.details.expires_at).toLocaleDateString("fr-FR")}</>}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
