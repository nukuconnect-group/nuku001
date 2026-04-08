import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, XCircle, Clock, FileText, Loader2, Eye, User, ShieldCheck,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-100 text-green-800 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" />Approuvé</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-800 text-[10px]"><XCircle className="w-3 h-3 mr-1" />Refusé</Badge>;
    default:
      return <Badge className="bg-yellow-100 text-yellow-800 text-[10px]"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
  }
};

const KYCManager = () => {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("driver_kyc_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setSubmissions(data);
      // Load profile names
      const userIds = [...new Set(data.map((s: any) => s.user_id))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);
        if (profs) {
          const map: Record<string, any> = {};
          profs.forEach((p: any) => { map[p.user_id] = p; });
          setProfiles(map);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleDecision = async (kyc: any, decision: "approved" | "rejected") => {
    setProcessing(true);
    try {
      // Update KYC status
      const { error: kycError } = await supabase
        .from("driver_kyc_submissions")
        .update({
          status: decision,
          admin_note: decision === "rejected" ? adminNote : null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", kyc.id);
      if (kycError) throw kycError;

      // If approved, activate driver profile
      if (decision === "approved") {
        const { error: dpError } = await supabase
          .from("driver_profiles")
          .update({ is_approved: true })
          .eq("user_id", kyc.user_id);
        if (dpError) throw dpError;
      }

      // Send notification to the driver
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: kyc.user_id,
        type: "kyc",
        title: decision === "approved"
          ? "✅ Compte livreur activé !"
          : "❌ Vérification KYC refusée",
        description: decision === "approved"
          ? "Votre vérification KYC a été approuvée. Votre compte livreur est maintenant actif. Vous pouvez commencer à accepter des livraisons !"
          : `Votre vérification KYC a été refusée.${adminNote ? ` Motif : ${adminNote}` : " Veuillez resoumettre vos documents."}`,
      });
      if (notifError) console.error("Notification error:", notifError);

      toast({
        title: decision === "approved" ? "KYC approuvé ✓" : "KYC refusé",
        description: decision === "approved"
          ? "Le livreur a été notifié et son compte activé."
          : "Le livreur a été notifié du refus.",
      });

      setSelectedKyc(null);
      setAdminNote("");
      loadData();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const pending = submissions.filter((s) => s.status === "pending");
  const reviewed = submissions.filter((s) => s.status !== "pending");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Vérifications KYC Livreurs
            {pending.length > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800 text-[10px]">{pending.length} en attente</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune soumission KYC</p>
          ) : (
            <div className="space-y-2">
              {submissions.map((kyc) => {
                const profile = profiles[kyc.user_id];
                return (
                  <div
                    key={kyc.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{profile?.full_name || "Livreur"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {kyc.id_type.toUpperCase()} • {kyc.id_number || "—"} • {new Date(kyc.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(kyc.status)}
                      <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => { setSelectedKyc(kyc); setAdminNote(kyc.admin_note || ""); }}>
                        <Eye className="w-3 h-3" /> Voir
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedKyc} onOpenChange={(o) => { if (!o) setSelectedKyc(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" />
              Détail KYC — {profiles[selectedKyc?.user_id]?.full_name || "Livreur"}
            </DialogTitle>
          </DialogHeader>
          {selectedKyc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Type :</span> {selectedKyc.id_type.toUpperCase()}</div>
                <div><span className="text-muted-foreground">Numéro :</span> {selectedKyc.id_number || "—"}</div>
                <div><span className="text-muted-foreground">Soumis le :</span> {new Date(selectedKyc.created_at).toLocaleString("fr-FR")}</div>
                <div><span className="text-muted-foreground">Statut :</span> {statusBadge(selectedKyc.status)}</div>
              </div>

              {/* Document previews */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Recto", url: selectedKyc.id_front_url },
                  { label: "Verso", url: selectedKyc.id_back_url },
                  { label: "Selfie", url: selectedKyc.selfie_url },
                ].map(({ label, url }) => (
                  <div key={label} className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={label} className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity" />
                      </a>
                    ) : (
                      <div className="w-full h-24 rounded-lg border bg-muted/30 flex items-center justify-center text-[10px] text-muted-foreground">Non fourni</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions */}
              {selectedKyc.status === "pending" && (
                <div className="space-y-3 pt-2 border-t">
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Note admin (obligatoire en cas de refus)..."
                    className="text-xs"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-1.5"
                      onClick={() => handleDecision(selectedKyc, "approved")}
                      disabled={processing}
                    >
                      {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Approuver
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 gap-1.5"
                      onClick={() => {
                        if (!adminNote.trim()) {
                          toast({ title: "Ajoutez une note pour le refus", variant: "destructive" });
                          return;
                        }
                        handleDecision(selectedKyc, "rejected");
                      }}
                      disabled={processing}
                    >
                      {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Refuser
                    </Button>
                  </div>
                </div>
              )}

              {selectedKyc.status !== "pending" && selectedKyc.admin_note && (
                <div className="p-2 rounded-lg bg-muted/50 text-xs">
                  <span className="text-muted-foreground">Note admin :</span> {selectedKyc.admin_note}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KYCManager;
