import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Mail, CheckCircle, XCircle, Ban, Loader2, RefreshCw, AlertTriangle, RotateCcw } from "lucide-react";
import { StatsGrid } from "@/components/dashboard/DashboardStats";
import { useToast } from "@/hooks/use-toast";

type TimeRange = "24h" | "7d" | "30d";

interface EmailLog {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  suppressed: number;
}

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  sent: { label: "Envoyé", variant: "default" },
  pending: { label: "En attente", variant: "secondary" },
  failed: { label: "Échoué", variant: "destructive" },
  dlq: { label: "DLQ", variant: "destructive" },
  suppressed: { label: "Désabonné", variant: "outline" },
  bounced: { label: "Rebond", variant: "destructive" },
  complained: { label: "Plainte", variant: "destructive" },
};

const EmailStatsManager = () => {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats>({ total: 0, sent: 0, failed: 0, suppressed: 0 });
  const [templates, setTemplates] = useState<string[]>([]);
  const [emailToType, setEmailToType] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [dlqLogs, setDlqLogs] = useState<EmailLog[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const PAGE_SIZE = 50;

  const getStartDate = useCallback((range: TimeRange) => {
    const now = new Date();
    switch (range) {
      case "24h": return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const startDate = getStartDate(timeRange);

    const { data: rawLogs } = await supabase
      .from("email_send_log")
      .select("*")
      .gte("created_at", startDate)
      .order("created_at", { ascending: false })
      .limit(1000);

    const allLogs = rawLogs || [];

    const seen = new Map<string, EmailLog>();
    for (const log of allLogs) {
      const key = log.message_id || log.id;
      if (!seen.has(key) || new Date(log.created_at) > new Date(seen.get(key)!.created_at)) {
        seen.set(key, log as EmailLog);
      }
    }
    const deduplicated = Array.from(seen.values());

    // Map recipient emails -> user_type via profiles + auth.users (via admin RPC if needed)
    const recipients = [...new Set(deduplicated.map(l => l.recipient_email).filter(Boolean))];
    const typeMap: Record<string, string> = {};
    if (recipients.length > 0) {
      // Use get_admin_users RPC and join by email through auth (we only have profile names)
      // Fallback: query profiles via user_id list — not feasible without email; we infer from template_name when possible
      // Best-effort: pull all admin users and match by email when present
      try {
        const { data: adminUsers } = await supabase.rpc("get_admin_users");
        const usersList = (adminUsers as any[]) || [];
        // get_admin_users does not expose email; we still keep template-based inference
        usersList.forEach(() => { /* no-op email mapping */ });
      } catch { /* ignore */ }

      // Heuristic mapping based on template name (more reliable than email lookup)
      for (const log of deduplicated) {
        const t = (log.template_name || "").toLowerCase();
        if (t.includes("seller") || t.includes("producer") || t.includes("supplier") || t.includes("withdrawal")) {
          typeMap[log.recipient_email] = "producer";
        } else if (t.includes("buyer") || t.includes("order-confirmation") || t.includes("delivery")) {
          typeMap[log.recipient_email] = "buyer";
        } else {
          typeMap[log.recipient_email] = typeMap[log.recipient_email] || "all";
        }
      }
    }
    setEmailToType(typeMap);

    const uniqueTemplates = [...new Set(deduplicated.map(l => l.template_name))].sort();
    setTemplates(uniqueTemplates);

    const computedStats: EmailStats = { total: deduplicated.length, sent: 0, failed: 0, suppressed: 0 };
    for (const log of deduplicated) {
      if (log.status === "sent") computedStats.sent++;
      else if (["failed", "dlq", "bounced", "complained"].includes(log.status)) computedStats.failed++;
      else if (log.status === "suppressed") computedStats.suppressed++;
    }
    setStats(computedStats);

    let filtered = deduplicated;
    if (templateFilter !== "all") filtered = filtered.filter(l => l.template_name === templateFilter);
    if (statusFilter !== "all") {
      if (statusFilter === "sent") filtered = filtered.filter(l => l.status === "sent");
      else if (statusFilter === "failed") filtered = filtered.filter(l => ["failed", "dlq", "bounced", "complained"].includes(l.status));
      else if (statusFilter === "suppressed") filtered = filtered.filter(l => l.status === "suppressed");
    }
    if (userTypeFilter !== "all") {
      filtered = filtered.filter(l => typeMap[l.recipient_email] === userTypeFilter);
    }

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setLogs(filtered);

    // DLQ (dead-letter queue) — failed-after-retries items
    setDlqLogs(deduplicated.filter(l => l.status === "dlq" || l.status === "failed").slice(0, 50));

    setPage(0);
    setIsLoading(false);
  }, [timeRange, templateFilter, statusFilter, userTypeFilter, getStartDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const paginatedLogs = logs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(logs.length / PAGE_SIZE);

  const retryDlq = async (log: EmailLog) => {
    setRetryingId(log.id);
    try {
      // Re-enqueue via RPC for the appropriate queue
      const queue = (log.template_name || "").toLowerCase().includes("auth") ? "auth_emails" : "transactional_emails";
      const payload = {
        template_name: log.template_name,
        to: log.recipient_email,
        message_id: log.message_id,
        retried_at: new Date().toISOString(),
      };
      const { error } = await supabase.rpc("enqueue_email", { queue_name: queue, payload });
      if (error) throw error;
      toast({ title: "Relance programmée", description: `Email "${log.template_name}" remis en file.` });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Erreur de relance", description: err.message, variant: "destructive" });
    }
    setRetryingId(null);
  };

  const statCards = [
    { label: "Total emails", value: stats.total, icon: Mail, color: "bg-blue-500/15 text-blue-600" },
    { label: "Envoyés", value: stats.sent, icon: CheckCircle, color: "bg-green-500/15 text-green-600" },
    { label: "Échoués", value: stats.failed, icon: XCircle, color: "bg-destructive/15 text-destructive" },
    { label: "Désabonnés", value: stats.suppressed, icon: Ban, color: "bg-yellow-500/15 text-yellow-600" },
  ];

  return (
    <div className="space-y-4">
      <StatsGrid stats={statCards} />

      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />Journal des emails
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex gap-1">
              {([["24h", "24h"], ["7d", "7 jours"], ["30d", "30 jours"]] as const).map(([val, label]) => (
                <Button
                  key={val}
                  variant={timeRange === val ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(val)}
                  className="text-xs h-8"
                >
                  {label}
                </Button>
              ))}
            </div>

            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Type d'email" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {templates.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="sent">Envoyés</SelectItem>
                <SelectItem value="failed">Échoués</SelectItem>
                <SelectItem value="suppressed">Désabonnés</SelectItem>
              </SelectContent>
            </Select>

            <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Type d'utilisateur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous utilisateurs</SelectItem>
                <SelectItem value="producer">Fournisseurs</SelectItem>
                <SelectItem value="buyer">Acheteurs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucun email trouvé pour cette période / ce filtre.
            </div>
          ) : (
            <>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Destinataire</TableHead>
                      <TableHead className="text-xs">Profil</TableHead>
                      <TableHead className="text-xs">Statut</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Erreur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log) => {
                      const badge = STATUS_BADGES[log.status] || { label: log.status, variant: "secondary" as const };
                      const userType = emailToType[log.recipient_email] || "—";
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs font-medium">{log.template_name}</TableCell>
                          <TableCell className="text-xs truncate max-w-[150px]">{log.recipient_email}</TableCell>
                          <TableCell className="text-[10px]">
                            {userType === "producer" ? <Badge variant="default" className="text-[9px]">Fournisseur</Badge>
                              : userType === "buyer" ? <Badge variant="secondary" className="text-[9px]">Acheteur</Badge>
                              : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </TableCell>
                          <TableCell className="text-xs text-destructive truncate max-w-[200px] hidden sm:table-cell">
                            {log.error_message || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">{logs.length} emails</p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-xs h-7">
                      Précédent
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-xs h-7">
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dead-letter queue (DLQ) */}
      <Card className="border-destructive/30">
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />Dead-letter queue (DLQ)
          </CardTitle>
          <CardDescription className="text-[11px]">
            Emails échoués après plusieurs tentatives. Vous pouvez relancer le traitement.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          {dlqLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              ✅ Aucun message en DLQ — tout fonctionne normalement.
            </p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Destinataire</TableHead>
                    <TableHead className="text-xs">Raison</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dlqLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs font-medium">{log.template_name}</TableCell>
                      <TableCell className="text-xs truncate max-w-[160px]">{log.recipient_email}</TableCell>
                      <TableCell className="text-[10px] text-destructive truncate max-w-[200px]">{log.error_message || "Échec après tentatives"}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] gap-1"
                          disabled={retryingId === log.id}
                          onClick={() => retryDlq(log)}
                        >
                          {retryingId === log.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                          Relancer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailStatsManager;
