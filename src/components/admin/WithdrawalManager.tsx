import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Wallet, CheckCircle, XCircle, Clock, Loader2, Phone, Banknote, Shield, AlertTriangle, Image, User } from "lucide-react";

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

const KYC_STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "En cours de vérification", className: "bg-amber-100 text-amber-800" },
  approved: { label: "KYC Validé ✅", className: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "KYC Refusé", className: "bg-red-100 text-red-800" },
};

const WithdrawalManager = () => {
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [kycData, setKycData] = useState<any>(null);
  const [kycLoading, setKycLoading] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("withdrawals")
      .select("*, profiles:profile_id(full_name, phone, avatar_url, user_type)")
      .order("created_at", { ascending: false });
    setWithdrawals(data || []);
    setIsLoading(false);
  };

  // Fetch KYC data when selecting a withdrawal
  const fetchKYC = async (userId: string, userType: string) => {
    setKycLoading(true);
    setKycData(null);
    try {
      // Check driver KYC
      const { data: driverKyc } = await supabase
        .from("driver_kyc_submissions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (driverKyc) {
        setKycData({ type: "driver", ...driverKyc });
        setKycLoading(false);
        return;
      }

      // Check supplier KYC
      const { data: supplierKyc } = await supabase
        .from("supplier_kyc_submissions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (supplierKyc) {
        setKycData({ type: "supplier", ...supplierKyc });
      } else {
        setKycData(null);
      }
    } catch {
      setKycData(null);
    }
    setKycLoading(false);
  };

  const handleSelectWithdrawal = (w: any) => {
    setSelectedWithdrawal(w);
    setAdminNote(w.admin_note || "");
    if (w.user_id) {
      fetchKYC(w.user_id, w.profiles?.user_type || "");
    }
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
      setKycData(null);
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
            <p className="text-lg font-bold">{totalPending.toLocaleString("en-US")} FCFA</p>
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
                    onClick={() => handleSelectWithdrawal(w)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {profileData?.avatar_url ? (
                        <img src={profileData.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{profileData?.full_name || "Utilisateur"}</p>
                        <p className="text-[10px] font-semibold text-primary">{Number(w.amount).toLocaleString("en-US")} FCFA</p>
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

      {/* Detail Dialog with KYC verification */}
      <Dialog open={!!selectedWithdrawal} onOpenChange={(open) => { if (!open) { setSelectedWithdrawal(null); setKycData(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Détails du retrait
            </DialogTitle>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-3">
              {/* User info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Demandeur</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {selectedWithdrawal.profiles?.avatar_url && (
                      <img src={selectedWithdrawal.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                    )}
                    <p className="font-medium">{selectedWithdrawal.profiles?.full_name || "N/A"}</p>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Montant</p>
                  <p className="font-bold text-primary">{Number(selectedWithdrawal.amount).toLocaleString("en-US")} FCFA</p>
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

              {/* KYC Verification Section */}
              <Card className="border-primary/20">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Vérification KYC
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-1">
                  {kycLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground ml-2">Chargement KYC...</span>
                    </div>
                  ) : !kycData ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="text-xs font-medium text-red-700 dark:text-red-400">KYC non soumis</p>
                        <p className="text-[10px] text-red-600/70 dark:text-red-400/70">Cet utilisateur n'a pas passé la vérification d'identité</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Statut KYC</span>
                        <Badge className={`text-[9px] ${KYC_STATUS_MAP[kycData.status]?.className || "bg-muted"}`}>
                          {KYC_STATUS_MAP[kycData.status]?.label || kycData.status}
                        </Badge>
                      </div>

                      {/* Identity document info */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        {kycData.id_type && (
                          <div className="bg-muted/50 rounded p-1.5">
                            <p className="text-muted-foreground">Type de pièce</p>
                            <p className="font-medium">{kycData.id_type}</p>
                          </div>
                        )}
                        {kycData.id_number && (
                          <div className="bg-muted/50 rounded p-1.5">
                            <p className="text-muted-foreground">N° pièce</p>
                            <p className="font-medium">{kycData.id_number}</p>
                          </div>
                        )}
                        {kycData.license_plate && (
                          <div className="bg-muted/50 rounded p-1.5">
                            <p className="text-muted-foreground">Plaque</p>
                            <p className="font-medium">{kycData.license_plate}</p>
                          </div>
                        )}
                        {kycData.vehicle_brand && (
                          <div className="bg-muted/50 rounded p-1.5">
                            <p className="text-muted-foreground">Véhicule</p>
                            <p className="font-medium">{kycData.vehicle_brand} {kycData.vehicle_color || ""}</p>
                          </div>
                        )}
                      </div>

                      {/* Documents preview */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                          <Image className="w-3 h-3" /> Documents justificatifs
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {kycData.id_front_url && (
                            <div className="space-y-0.5">
                              <a href={kycData.id_front_url} target="_blank" rel="noopener noreferrer">
                                <img src={kycData.id_front_url} alt="ID Recto" className="w-full h-16 object-cover rounded-lg border border-border hover:ring-2 ring-primary cursor-pointer" />
                              </a>
                              <p className="text-[8px] text-center text-muted-foreground">Recto</p>
                            </div>
                          )}
                          {kycData.id_back_url && (
                            <div className="space-y-0.5">
                              <a href={kycData.id_back_url} target="_blank" rel="noopener noreferrer">
                                <img src={kycData.id_back_url} alt="ID Verso" className="w-full h-16 object-cover rounded-lg border border-border hover:ring-2 ring-primary cursor-pointer" />
                              </a>
                              <p className="text-[8px] text-center text-muted-foreground">Verso</p>
                            </div>
                          )}
                          {kycData.selfie_url && (
                            <div className="space-y-0.5">
                              <a href={kycData.selfie_url} target="_blank" rel="noopener noreferrer">
                                <img src={kycData.selfie_url} alt="Selfie" className="w-full h-16 object-cover rounded-lg border border-border hover:ring-2 ring-primary cursor-pointer" />
                              </a>
                              <p className="text-[8px] text-center text-muted-foreground">Selfie</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {kycData.submitted_at && (
                        <p className="text-[9px] text-muted-foreground">
                          Soumis le {new Date(kycData.submitted_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Admin note */}
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
