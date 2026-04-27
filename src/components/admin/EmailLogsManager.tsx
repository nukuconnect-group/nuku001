import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mail, CheckCircle2, XCircle, Ban, Loader2, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";

type LogRow = {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
};

const RANGES: Record<string, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
};

const statusColor = (s: string) => {
  switch (s) {
    case "sent":
      return "bg-emerald-500/15 text-emerald-700 border-emerald-300";
    case "dlq":
    case "failed":
    case "bounced":
      return "bg-destructive/15 text-destructive border-destructive/40";
    case "suppressed":
    case "complained":
      return "bg-amber-500/15 text-amber-700 border-amber-300";
    case "pending":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const EmailLogsManager = () => {
  const [rawRows, setRawRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<string>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [template, setTemplate] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const fetchLogs = async () => {
    setLoading(true);
    let startDate: Date;
    let endDate: Date = new Date();
    if (range === "custom" && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    } else {
      const days = RANGES[range] ?? 7;
      startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    const { data, error } = await supabase
      .from("email_send_log")
      .select("id, message_id, template_name, recipient_email, status, error_message, created_at")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(2000);

    if (!error && data) setRawRows(data as LogRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, customStart, customEnd]);

  // Deduplicate by message_id (latest status per email) + compute response time
  const dedupedRows = useMemo(() => {
    // rawRows is sorted DESC (most recent first)
    const latest = new Map<string, LogRow>();
    const earliest = new Map<string, LogRow>();
    for (const row of rawRows) {
      const key = row.message_id || row.id;
      if (!latest.has(key)) latest.set(key, row);
      earliest.set(key, row); // overwritten => last assignment is the oldest
    }
    return Array.from(latest.entries()).map(([key, row]) => {
      const first = earliest.get(key);
      const responseMs = first && first.id !== row.id
        ? new Date(row.created_at).getTime() - new Date(first.created_at).getTime()
        : null;
      return { ...row, response_ms: responseMs };
    });
  }, [rawRows]);

  const templates = useMemo(() => {
    const set = new Set<string>();
    dedupedRows.forEach((r) => set.add(r.template_name));
    return Array.from(set).sort();
  }, [dedupedRows]);

  const filtered = useMemo(() => {
    return dedupedRows.filter((r) => {
      if (template !== "all" && r.template_name !== template) return false;
      if (status !== "all" && r.status !== status) return false;
      return true;
    });
  }, [dedupedRows, template, status]);

  const stats = useMemo(() => {
    const s = { total: filtered.length, sent: 0, failed: 0, suppressed: 0, pending: 0 };
    filtered.forEach((r) => {
      if (r.status === "sent") s.sent++;
      else if (["dlq", "failed", "bounced"].includes(r.status)) s.failed++;
      else if (["suppressed", "complained"].includes(r.status)) s.suppressed++;
      else if (r.status === "pending") s.pending++;
    });
    return s;
  }, [filtered]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Logs Emails
          </h2>
          <p className="text-sm text-muted-foreground">
            Suivi des envois (signup, welcome, etc.) — déduplication par message
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={loading || filtered.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total emails</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Envoyés
            </div>
            <div className="text-2xl font-bold text-emerald-600">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <XCircle className="w-3 h-3 text-destructive" /> Échoués
            </div>
            <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Ban className="w-3 h-3 text-amber-600" /> Supprimés
            </div>
            <div className="text-2xl font-bold text-amber-600">{stats.suppressed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["24h", "7d", "30d", "custom"] as const).map((r) => (
              <Button
                key={r}
                variant={range === r ? "default" : "outline"}
                size="sm"
                onClick={() => setRange(r)}
              >
                {r === "24h" ? "24 h" : r === "7d" ? "7 jours" : r === "30d" ? "30 jours" : "Personnalisé"}
              </Button>
            ))}
          </div>
          {range === "custom" && (
            <div className="flex flex-wrap gap-2">
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-44"
              />
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-44"
              />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Template</label>
              <Select value={template} onValueChange={(v) => { setTemplate(v); setPage(0); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les templates</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Statut</label>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="sent">Envoyés</SelectItem>
                  <SelectItem value="dlq">Échoués (DLQ)</SelectItem>
                  <SelectItem value="failed">Échoués</SelectItem>
                  <SelectItem value="bounced">Rebonds</SelectItem>
                  <SelectItem value="suppressed">Supprimés</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : paged.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Aucun email trouvé pour les filtres sélectionnés.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Erreur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-xs">{row.template_name}</TableCell>
                    <TableCell className="text-xs">{row.recipient_email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${statusColor(row.status)}`}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-xs text-destructive max-w-xs truncate">
                      {row.error_message || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page + 1} / {totalPages} — {filtered.length} emails
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailLogsManager;
