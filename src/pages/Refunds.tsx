import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, RotateCcw, Trash2, Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TYPE_OPTIONS = [
  { value: "refund", label: "Remboursement" },
  { value: "return", label: "Retour produit" },
  { value: "complaint", label: "Réclamation" },
  { value: "other", label: "Autre demande" },
];

const STATUS_CONFIG: Record<string, { label: string; icon: any; className: string }> = {
  pending: { label: "En attente", icon: Clock, className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  in_review: { label: "En examen", icon: AlertCircle, className: "bg-blue-100 text-blue-800 border-blue-300" },
  approved: { label: "Approuvée", icon: CheckCircle2, className: "bg-green-100 text-green-800 border-green-300" },
  rejected: { label: "Rejetée", icon: XCircle, className: "bg-red-100 text-red-800 border-red-300" },
  resolved: { label: "Résolue", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
};

const Refunds = () => {
  const navigate = useNavigate();
  const { user, isReady } = useProfile();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    type: "refund",
    order_id: "",
    reason: "",
    description: "",
    amount: "",
  });

  useEffect(() => {
    if (!isReady) return;
    if (!user) { navigate("/auth"); return; }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, user]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("refund_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Impossible de charger vos demandes");
    setRequests(data || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      return true;
    });
  }, [requests, statusFilter, typeFilter]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.reason.trim()) {
      toast.error("Veuillez indiquer un motif");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("refund_requests").insert({
      user_id: user.id,
      type: form.type,
      order_id: form.order_id || null,
      reason: form.reason.trim(),
      description: form.description.trim() || null,
      amount: form.amount ? Number(form.amount) : null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Erreur lors de l'envoi");
      return;
    }
    toast.success("Demande envoyée. Notre équipe vous répondra sous 48h.");
    setOpen(false);
    setForm({ type: "refund", order_id: "", reason: "", description: "", amount: "" });
    void load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("refund_requests").delete().eq("id", id);
    if (error) {
      toast.error("Suppression impossible");
      return;
    }
    toast.success("Demande supprimée");
    setRequests((r) => r.filter((x) => x.id !== id));
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Helmet>
        <title>Remboursements & Retours – Nukuconnect</title>
        <meta name="description" content="Gérez vos demandes de remboursement, retours produits et réclamations sur Nukuconnect." />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold">Remboursements & Retours</h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-5">
          Demandez un remboursement, signalez un produit défectueux, retournez un article ou déposez une réclamation.
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-md">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Nouvelle demande
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nouvelle demande</DialogTitle>
                  <DialogDescription>Décrivez votre demande, notre équipe la traitera sous 48h.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Type de demande</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TYPE_OPTIONS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>N° de commande (optionnel)</Label>
                    <Input
                      placeholder="ID commande"
                      value={form.order_id}
                      onChange={(e) => setForm({ ...form, order_id: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Motif *</Label>
                    <Input
                      placeholder="Ex: Produit endommagé"
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Description détaillée</Label>
                    <Textarea
                      rows={4}
                      placeholder="Expliquez la situation..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Montant réclamé (FCFA)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                  </div>
                  <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Envoyer la demande
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-md" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <RotateCcw className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mb-3">Aucune demande pour le moment</p>
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Créer ma première demande
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              const typeLabel = TYPE_OPTIONS.find((t) => t.value === r.type)?.label || r.type;
              return (
                <Card key={r.id}>
                  <CardContent className="p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <Badge variant="outline" className="text-[11px]">{typeLabel}</Badge>
                          <Badge className={`text-[11px] border ${cfg.className}`}>
                            <Icon className="w-3 h-3 mr-1" />
                            {cfg.label}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm">{r.reason}</p>
                        {r.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                        )}
                        {r.admin_response && (
                          <div className="mt-2 p-2 bg-muted/40 rounded text-xs">
                            <span className="font-medium">Réponse: </span>{r.admin_response}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                          <span>{new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
                          {r.amount && <span>{Number(r.amount).toLocaleString()} FCFA</span>}
                        </div>
                      </div>
                      {r.status === "pending" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(r.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Refunds;
