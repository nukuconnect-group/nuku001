import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw, Search, CheckCircle2, XCircle, Clock, Eye, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

interface RefundRow {
  id: string;
  user_id: string;
  order_id: string | null;
  type: string;
  reason: string;
  description: string | null;
  amount: number | null;
  status: string;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string | null;
  user_email?: string | null;
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  in_review: { label: "En examen", variant: "outline" },
  approved: { label: "Approuvée", variant: "default" },
  rejected: { label: "Rejetée", variant: "destructive" },
  resolved: { label: "Résolue", variant: "default" },
};

const TYPE_LABELS: Record<string, string> = {
  refund: "Remboursement",
  return: "Retour",
  complaint: "Réclamation",
  other: "Autre",
};

const RefundsManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RefundRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selected, setSelected] = useState<RefundRow | null>(null);
  const [newStatus, setNewStatus] = useState<string>("pending");
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("refund_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const userIds = Array.from(new Set((data || []).map((r) => r.user_id)));
    let profiles: Record<string, { full_name: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      (profs || []).forEach((p) => {
        profiles[p.user_id] = { full_name: p.full_name };
      });
    }

    setRows(
      (data || []).map((r) => ({
        ...r,
        user_name: profiles[r.user_id]?.full_name || null,
      })) as RefundRow[],
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openDetail = (r: RefundRow) => {
    setSelected(r);
    setNewStatus(r.status);
    setResponse(r.admin_response || "");
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from("refund_requests")
      .update({
        status: newStatus,
        admin_response: response.trim() || null,
      })
      .eq("id", selected.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Notify the user
    try {
      await supabase.from("notifications").insert({
        user_id: selected.user_id,
        type: "refund",
        title:
          newStatus === "approved"
            ? "✅ Demande approuvée"
            : newStatus === "rejected"
              ? "❌ Demande rejetée"
              : newStatus === "resolved"
                ? "📦 Demande résolue"
                : "🔄 Demande mise à jour",
        description:
          (response.trim() ? response.trim() + " — " : "") +
          `Votre demande "${selected.reason}" est ${STATUS_LABELS[newStatus]?.label || newStatus}.`,
      });
    } catch (e) {
      console.warn("Notification insert failed", e);
    }

    toast({ title: "Mise à jour effectuée" });
    setSelected(null);
    setSaving(false);
    load();
  };

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (dateFrom) {
      const from = new Date(dateFrom + "T00:00:00").getTime();
      if (new Date(r.created_at).getTime() < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59").getTime();
      if (new Date(r.created_at).getTime() > to) return false;
    }
    if (!q) return true;
    return (
      r.reason.toLowerCase().includes(q) ||
      (r.description || "").toLowerCase().includes(q) ||
      (r.user_name || "").toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  });

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast({ title: "Aucune donnée à exporter", variant: "destructive" });
      return;
    }
    const headers = ["ID", "Date", "Type", "Statut", "Utilisateur", "Motif", "Description", "Montant (FCFA)", "Réponse admin"];
    const escape = (v: string | number | null | undefined) => {
      const s = (v ?? "").toString().replace(/"/g, '""');
      return `"${s}"`;
    };
    const lines = filtered.map((r) =>
      [
        r.id,
        format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
        TYPE_LABELS[r.type] || r.type,
        STATUS_LABELS[r.status]?.label || r.status,
        r.user_name || r.user_id,
        r.reason,
        r.description || "",
        r.amount ?? "",
        r.admin_response || "",
      ].map(escape).join(","),
    );
    const csv = "\uFEFF" + headers.map(escape).join(",") + "\n" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `remboursements_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Export CSV téléchargé", description: `${filtered.length} demandes exportées.` });
  };

  const exportPDF = () => {
    if (filtered.length === 0) {
      toast({ title: "Aucune donnée à exporter", variant: "destructive" });
      return;
    }
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Nukuconnect — Demandes de remboursement", 14, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Exporté le ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })} • ${filtered.length} demande(s)`,
      14,
      21,
    );
    const filterLine = [
      statusFilter !== "all" ? `Statut: ${STATUS_LABELS[statusFilter]?.label}` : null,
      dateFrom ? `Du ${dateFrom}` : null,
      dateTo ? `Au ${dateTo}` : null,
    ].filter(Boolean).join(" • ");
    if (filterLine) doc.text(`Filtres: ${filterLine}`, 14, 26);

    const headers = ["Date", "Type", "Statut", "Utilisateur", "Motif", "Montant"];
    const colWidths = [28, 28, 28, 45, 90, 25];
    let y = 34;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setFillColor(240, 240, 240);
    doc.rect(14, y - 4, colWidths.reduce((a, b) => a + b, 0), 6, "F");
    let x = 14;
    headers.forEach((h, i) => {
      doc.text(h, x + 1, y);
      x += colWidths[i];
    });
    y += 4;

    doc.setFont("helvetica", "normal");
    filtered.forEach((r) => {
      if (y > pageHeight - 12) {
        doc.addPage();
        y = 15;
      }
      const row = [
        format(new Date(r.created_at), "dd/MM/yy HH:mm"),
        TYPE_LABELS[r.type] || r.type,
        STATUS_LABELS[r.status]?.label || r.status,
        (r.user_name || r.user_id).slice(0, 28),
        r.reason.slice(0, 70),
        r.amount ? `${Number(r.amount).toLocaleString()}` : "—",
      ];
      x = 14;
      row.forEach((cell, i) => {
        doc.text(cell, x + 1, y);
        x += colWidths[i];
      });
      y += 5;
      doc.setDrawColor(230);
      doc.line(14, y - 2, 14 + colWidths.reduce((a, b) => a + b, 0), y - 2);
    });

    doc.save(`remboursements_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({ title: "Export PDF téléchargé", description: `${filtered.length} demandes exportées.` });
  };


  const counts = {
    pending: rows.filter((r) => r.status === "pending").length,
    in_review: rows.filter((r) => r.status === "in_review").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    resolved: rows.filter((r) => r.status === "resolved").length,
  };

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Remboursements & Réclamations
            </CardTitle>
            <CardDescription className="text-[11px]">
              {counts.pending} en attente • {counts.in_review} en examen • {counts.approved} approuvées • {counts.rejected} rejetées
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Actualiser"}
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher (motif, utilisateur, ID)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs sm:w-44">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="in_review">En examen</SelectItem>
              <SelectItem value="approved">Approuvée</SelectItem>
              <SelectItem value="rejected">Rejetée</SelectItem>
              <SelectItem value="resolved">Résolue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-10">Aucune demande trouvée.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const status = STATUS_LABELS[r.status] || { label: r.status, variant: "secondary" as const };
              return (
                <button
                  key={r.id}
                  onClick={() => openDetail(r)}
                  className="w-full text-left border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={status.variant} className="text-[10px]">
                          {status.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {TYPE_LABELS[r.type] || r.type}
                        </span>
                        {r.amount && (
                          <span className="text-[10px] font-semibold text-primary">
                            {Number(r.amount).toLocaleString()} FCFA
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-foreground truncate">{r.reason}</p>
                      {r.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                          {r.description}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {r.user_name || "Utilisateur"} •{" "}
                        {format(new Date(r.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                      </p>
                    </div>
                    <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Traiter la demande</DialogTitle>
            <DialogDescription className="text-xs">
              Mettez à jour le statut et envoyez une réponse à l'utilisateur.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-xs">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p>
                  <span className="text-muted-foreground">Type :</span>{" "}
                  <strong>{TYPE_LABELS[selected.type] || selected.type}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Motif :</span> <strong>{selected.reason}</strong>
                </p>
                {selected.description && (
                  <p>
                    <span className="text-muted-foreground">Description :</span> {selected.description}
                  </p>
                )}
                {selected.amount && (
                  <p>
                    <span className="text-muted-foreground">Montant :</span>{" "}
                    <strong>{Number(selected.amount).toLocaleString()} FCFA</strong>
                  </p>
                )}
                {selected.order_id && (
                  <p className="font-mono text-[10px]">
                    <span className="text-muted-foreground">Commande :</span> {selected.order_id}
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Utilisateur :</span>{" "}
                  {selected.user_name || selected.user_id}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-medium mb-1">Statut</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="in_review">En examen</SelectItem>
                    <SelectItem value="approved">Approuvée</SelectItem>
                    <SelectItem value="rejected">Rejetée</SelectItem>
                    <SelectItem value="resolved">Résolue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-[11px] font-medium mb-1">
                  Réponse à l'utilisateur (optionnel)
                </label>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Expliquez votre décision…"
                  rows={4}
                  className="text-xs"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)} disabled={saving}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default RefundsManager;
