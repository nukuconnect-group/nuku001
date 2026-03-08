import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Wallet, CheckCircle, XCircle, Clock, Loader2, Send, Phone, Banknote } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  pending: { label: "En attente", variant: "secondary" },
  approved: { label: "Approuvé", variant: "default" },
  rejected: { label: "Rejeté", variant: "destructive" },
  completed: { label: "Envoyé", variant: "default" },
};

const OPERATORS: Record<string, string> = {
  flooz: "Flooz (Moov)",
  tmoney: "T-Money (Togocel)",
  wave: "Wave",
};

const WithdrawalManager = () => {
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("withdrawals")
      .select("*, profiles:profile_id(full_name, phone, avatar_url)")
      .order("created_at", { ascending: false });
    setWithdrawals(data || []);
    setIsLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    setProcessing(true);
    const updateData: any = { status, admin_note: adminNote || null };
    if (status === "completed") updateData.processed_at = new Date().toISOString();

    const { error } = await supabase.from("withdrawals").update(updateData).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Retrait ${STATUS_MAP[status]?.label.toLowerCase() || status}` });
      setSelectedWithdrawal(null);
      setAdminNote("");
      fetchWithdrawals();
    }
    setProcessing(false);
  };

  const pendingCount = withdrawals.filter((w) => w.status === "pending").length;
  const totalPending = withdrawals
    .filter((w) => w.status === "pending")
    .reduce((s: number, w: any) => s + (Number(w.amount) || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-[10px] text-muted-foreground">En attente</span>
            </div>
            <p className="text-lg font-bold">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="w-4 h-4 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Montant en attente</span>
            </div>
            <p className="text-lg font-bold">{totalPending.toLocaleString()} FCFA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-[10px] text-muted-foreground">Total traités</span>
            </div>
            <p className="text-lg font-bold">{withdrawals.filter((w) => w.status === "completed").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Demandes de retrait ({withdrawals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          {withdrawals.length > 0 ? (
            <div className="space-y-2">
              {withdrawals.map((w) => {
                const st = STATUS_MAP[w.status] || STATUS_MAP.pending;
                const profileData = w.profiles;
                return (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-2.5 bg-muted/50 rounded-xl gap-2 cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => { setSelectedWithdrawal(w); setAdminNote(w.admin_note || ""); }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {profileData?.avatar_url ? (
                        <img src={profileData.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Wallet className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{profileData?.full_name || "Utilisateur"}</p>
                        <p className="text-[10px] font-semibold text-primary">{Number(w.amount).toLocaleString()} FCFA</p>
                        <p className="text-[9px] text-muted-foreground">
                          {OPERATORS[w.operator] || w.operator} · {w.phone_number} · {new Date(w.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <Badge variant={st.variant} className="text-[9px] flex-shrink-0">{st.label}</Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <Wallet className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">Aucune demande de retrait</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedWithdrawal} onOpenChange={(open) => { if (!open) setSelectedWithdrawal(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Détails du retrait
            </DialogTitle>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Fournisseur</p>
                  <p className="font-medium">{selectedWithdrawal.profiles?.full_name || "N/A"}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Montant</p>
                  <p className="font-bold text-primary">{Number(selectedWithdrawal.amount).toLocaleString()} FCFA</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Opérateur</p>
                  <p className="font-medium">{OPERATORS[selectedWithdrawal.operator] || selectedWithdrawal.operator}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Numéro</p>
                    <p className="font-medium">{selectedWithdrawal.phone_number}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">Note admin (optionnel)</label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Ajouter une note..."
                  className="text-xs min-h-[60px]"
                />
              </div>

              {selectedWithdrawal.status === "pending" && (
                <DialogFooter className="flex gap-2 sm:gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1 text-xs flex-1"
                    disabled={processing}
                    onClick={() => updateStatus(selectedWithdrawal.id, "rejected")}
                  >
                    <XCircle className="w-3.5 h-3.5" />Rejeter
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1 text-xs flex-1"
                    disabled={processing}
                    onClick={() => updateStatus(selectedWithdrawal.id, "completed")}
                  >
                    {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    Valider & Envoyer
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WithdrawalManager;
