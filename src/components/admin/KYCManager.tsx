import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { toast as sonner } from "sonner";
import {
  CheckCircle2, XCircle, Clock, FileText, Loader2, Eye, User, ShieldCheck, Truck, Store,
  ZoomIn, Mail, MailWarning, MailCheck, Send, History,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { KycImage } from "@/components/kyc/KycImage";

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

type EmailInfo = { status: string; created_at: string; error?: string | null };

const emailStatusBadge = (info?: EmailInfo) => {
  if (!info) {
    return (
      <Badge variant="outline" className="text-[10px] gap-1">
        <Mail className="w-3 h-3" /> Aucun
      </Badge>
    );
  }
  const date = new Date(info.created_at).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  if (info.status === "sent") {
    return (
      <Badge className="bg-green-100 text-green-800 text-[10px] gap-1" title={`Envoyé le ${date}`}>
        <MailCheck className="w-3 h-3" /> Envoyé · {date}
      </Badge>
    );
  }
  if (info.status === "pending") {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 text-[10px] gap-1" title={`En file depuis ${date}`}>
        <Mail className="w-3 h-3 animate-pulse" /> En attente · {date}
      </Badge>
    );
  }
  // failed / dlq / suppressed / bounced / complained
  return (
    <Badge className="bg-red-100 text-red-800 text-[10px] gap-1" title={info.error || info.status}>
      <MailWarning className="w-3 h-3" /> {info.status} · {date}
    </Badge>
  );
};

const KYCManager = () => {
  const { toast } = useToast();
  const [driverSubs, setDriverSubs] = useState<any[]>([]);
  const [supplierSubs, setSupplierSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<"driver" | "supplier">("driver");
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  // Map: idempotency key (kyc-<id>-<decision>) -> latest email row
  const [emailStatuses, setEmailStatuses] = useState<Record<string, EmailInfo>>({});
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const knownKeys = useRef<Set<string>>(new Set());

  const loadEmailStatuses = async (kycIds: string[]) => {
    if (!kycIds.length) return;
    const keys = kycIds.flatMap((id) => [`kyc-${id}-approved`, `kyc-${id}-rejected`]);
    const { data } = await supabase
      .from("email_send_log")
      .select("message_id, status, created_at, error_message")
      .in("message_id", keys)
      .order("created_at", { ascending: false });
    if (!data) return;
    const map: Record<string, EmailInfo> = {};
    for (const row of data) {
      // Latest first → keep the first occurrence per key
      if (!map[row.message_id]) {
        map[row.message_id] = {
          status: row.status,
          created_at: row.created_at,
          error: row.error_message,
        };
      }
    }
    setEmailStatuses(map);
    knownKeys.current = new Set(keys);
  };

  const loadData = async () => {
    setLoading(true);
    const [dRes, sRes] = await Promise.all([
      supabase.from("driver_kyc_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("supplier_kyc_submissions").select("*").order("created_at", { ascending: false }),
    ]);

    const allData = [...(dRes.data || []), ...(sRes.data || [])];
    setDriverSubs(dRes.data || []);
    setSupplierSubs(sRes.data || []);

    const userIds = [...new Set(allData.map((s: any) => s.user_id))];
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

    await loadEmailStatuses(allData.map((s: any) => s.id));
    setLoading(false);
  };

  const loadAuditLog = async () => {
    const { data } = await supabase
      .from("kyc_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setAuditLog(data || []);
  };

  useEffect(() => { loadData(); }, []);

  // Realtime: listen for KYC email status updates even if the modal is closed
  useEffect(() => {
    const channel = supabase
      .channel("kyc-email-status")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "email_send_log" },
        (payload: any) => {
          const row = payload.new;
          if (!row?.message_id || !row.message_id.startsWith("kyc-")) return;
          if (!knownKeys.current.has(row.message_id) && !row.message_id) return;
          setEmailStatuses((prev) => {
            const existing = prev[row.message_id];
            // Always keep latest by created_at
            if (existing && new Date(existing.created_at) > new Date(row.created_at)) {
              return prev;
            }
            return {
              ...prev,
              [row.message_id]: {
                status: row.status,
                created_at: row.created_at,
                error: row.error_message,
              },
            };
          });
          if (row.status === "sent") {
            sonner.success("Email KYC livré ✓", {
              description: `Confirmé par le serveur · ${row.message_id}`,
            });
          } else if (["dlq", "failed", "bounced"].includes(row.status)) {
            sonner.error(`Email KYC échoué (${row.status})`, {
              description: row.error_message || row.message_id,
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const sendKycEmail = async (kyc: any, type: "driver" | "supplier", decision: "approved" | "rejected", note: string) => {
    const profile = profiles[kyc.user_id];
    return supabase.functions.invoke("send-kyc-status-email", {
      body: {
        user_id: kyc.user_id,
        kyc_id: kyc.id,
        kyc_type: type,
        decision,
        admin_note: decision === "rejected" ? note : "",
        name: profile?.full_name || "",
      },
    });
  };

  const handleResend = async (kyc: any, type: "driver" | "supplier") => {
    if (kyc.status === "pending") {
      toast({ title: "Décision requise", description: "Approuvez ou refusez d'abord la soumission.", variant: "destructive" });
      return;
    }
    setResending(kyc.id);
    try {
      const { error } = await sendKycEmail(kyc, type, kyc.status, kyc.admin_note || "");
      if (error) throw error;
      toast({ title: "Email renvoyé ✉️", description: "Le statut va se mettre à jour en temps réel." });
      // Refresh email statuses for this kyc
      await loadEmailStatuses([kyc.id]);
    } catch (err: any) {
      toast({ title: "Erreur d'envoi", description: err.message, variant: "destructive" });
    } finally {
      setResending(null);
    }
  };

  const handleDecision = async (kyc: any, type: "driver" | "supplier", decision: "approved" | "rejected") => {
    setProcessing(true);
    try {
      const table = type === "driver" ? "driver_kyc_submissions" : "supplier_kyc_submissions";

      const { error: kycError } = await supabase
        .from(table)
        .update({
          status: decision,
          admin_note: decision === "rejected" ? adminNote : null,
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq("id", kyc.id);
      if (kycError) throw kycError;

      if (decision === "approved") {
        if (type === "driver") {
          await supabase.from("driver_profiles").update({ is_approved: true }).eq("user_id", kyc.user_id);
        } else {
          await supabase.from("profiles").update({ is_verified: true }).eq("user_id", kyc.user_id);
        }
      }

      await supabase.from("notifications").insert({
        user_id: kyc.user_id,
        type: "kyc",
        title: decision === "approved"
          ? type === "driver" ? "✅ Compte livreur activé !" : "✅ Fournisseur vérifié !"
          : "❌ Vérification KYC refusée",
        description: decision === "approved"
          ? type === "driver"
            ? "Votre vérification KYC a été approuvée. Votre compte livreur est maintenant actif."
            : "Votre vérification a été approuvée ! Le badge vérifié est maintenant actif sur votre profil. 🎉"
          : `Votre vérification a été refusée.${adminNote ? ` Motif : ${adminNote}` : " Veuillez resoumettre vos documents."}`,
      });

      // Send branded KYC status email (real-time, idempotent via Edge Function)
      sendKycEmail(kyc, type, decision, adminNote).then(({ error: emailErr }) => {
        if (emailErr) console.error("KYC email send failed (non-blocking):", emailErr);
      });

      toast({
        title: decision === "approved" ? "KYC approuvé ✓ Email envoyé" : "KYC refusé — Email envoyé",
        description: decision === "approved"
          ? type === "supplier" ? "Le fournisseur est vérifié. Email de confirmation envoyé." : "Le livreur a été activé. Email de confirmation envoyé."
          : "L'utilisateur a été notifié du refus par email avec le motif.",
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

  const renderList = (submissions: any[], type: "driver" | "supplier") => {
    return (
      <div className="space-y-2">
        {submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucune soumission</p>
        ) : (
          submissions.map((kyc) => {
            const profile = profiles[kyc.user_id];
            const emailKey = kyc.status !== "pending" ? `kyc-${kyc.id}-${kyc.status}` : null;
            const emailInfo = emailKey ? emailStatuses[emailKey] : undefined;
            return (
              <div key={kyc.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors flex-wrap gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{profile?.full_name || (type === "driver" ? "Livreur" : "Fournisseur")}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {kyc.id_type?.toUpperCase()} • {new Date(kyc.created_at).toLocaleDateString("fr-FR")}
                      {type === "supplier" && kyc.business_name ? ` • ${kyc.business_name}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {statusBadge(kyc.status)}
                  <span className="hidden sm:inline-flex">{emailStatusBadge(emailInfo)}</span>
                  {kyc.status !== "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={() => handleResend(kyc, type)}
                      disabled={resending === kyc.id}
                      title="Renvoyer l'email KYC"
                    >
                      {resending === kyc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Renvoyer
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => { setSelectedKyc(kyc); setSelectedType(type); setAdminNote(kyc.admin_note || ""); }}>
                    <Eye className="w-3 h-3" /> Voir
                  </Button>
                </div>
                {/* Mobile email status row */}
                <div className="sm:hidden w-full">{emailStatusBadge(emailInfo)}</div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const driverPending = driverSubs.filter(s => s.status === "pending").length;
  const supplierPending = supplierSubs.filter(s => s.status === "pending").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Vérifications KYC
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1"
            onClick={() => { loadAuditLog(); setShowHistory(true); }}
          >
            <History className="w-3 h-3" /> Journal
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="drivers">
            <TabsList className="mb-3">
              <TabsTrigger value="drivers" className="text-xs gap-1">
                <Truck className="w-3 h-3" /> Livreurs
                {driverPending > 0 && <Badge className="bg-yellow-100 text-yellow-800 text-[8px] ml-1 px-1">{driverPending}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="text-xs gap-1">
                <Store className="w-3 h-3" /> Fournisseurs
                {supplierPending > 0 && <Badge className="bg-yellow-100 text-yellow-800 text-[8px] ml-1 px-1">{supplierPending}</Badge>}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="drivers">{renderList(driverSubs, "driver")}</TabsContent>
            <TabsContent value="suppliers">{renderList(supplierSubs, "supplier")}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Detail Dialog — LARGE format images */}
      <Dialog open={!!selectedKyc} onOpenChange={(o) => { if (!o) setSelectedKyc(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" />
              Détail KYC — {profiles[selectedKyc?.user_id]?.full_name || (selectedType === "driver" ? "Livreur" : "Fournisseur")}
            </DialogTitle>
          </DialogHeader>
          {selectedKyc && (
            <div className="space-y-5">
              {/* Profile info */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {profiles[selectedKyc.user_id]?.avatar_url ? (
                    <img src={profiles[selectedKyc.user_id].avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{profiles[selectedKyc.user_id]?.full_name || "Utilisateur"}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {statusBadge(selectedKyc.status)}
                    {selectedKyc.status !== "pending" &&
                      emailStatusBadge(emailStatuses[`kyc-${selectedKyc.id}-${selectedKyc.status}`])}
                  </div>
                </div>
                {selectedKyc.status !== "pending" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => handleResend(selectedKyc, selectedType)}
                    disabled={resending === selectedKyc.id}
                  >
                    {resending === selectedKyc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Renvoyer email
                  </Button>
                )}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Type de pièce</p>
                  <p className="text-sm font-medium">{selectedKyc.id_type?.toUpperCase()}</p>
                </div>
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Numéro</p>
                  <p className="text-sm font-medium">{selectedKyc.id_number || "—"}</p>
                </div>
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Soumis le</p>
                  <p className="text-sm font-medium">{new Date(selectedKyc.created_at).toLocaleString("fr-FR")}</p>
                </div>
                {selectedType === "supplier" && selectedKyc.business_name && (
                  <div className="p-3 rounded-lg border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Entreprise</p>
                    <p className="text-sm font-medium">{selectedKyc.business_name} ({selectedKyc.business_type})</p>
                  </div>
                )}
                {selectedType === "driver" && selectedKyc.license_plate && (
                  <>
                    <div className="p-3 rounded-lg border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Plaque</p>
                      <p className="text-sm font-medium">{selectedKyc.license_plate}</p>
                    </div>
                    <div className="p-3 rounded-lg border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Véhicule</p>
                      <p className="text-sm font-medium">{selectedKyc.vehicle_brand || "—"} {selectedKyc.vehicle_color || ""}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Document previews — LARGE format */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Documents soumis
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Recto de la pièce", url: selectedKyc.id_front_url },
                    { label: "Verso de la pièce", url: selectedKyc.id_back_url },
                    { label: "Photo portrait (Selfie)", url: selectedKyc.selfie_url },
                  ].map(({ label, url }) => (
                    <div key={label} className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      <div
                        className="relative group cursor-pointer"
                        onClick={() => url && setZoomImage(url)}
                      >
                        <KycImage
                          src={url}
                          alt={label}
                          className="w-full h-48 rounded-lg border-2 border-border hover:border-primary transition-colors"
                        />
                        {url && (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center pointer-events-none">
                            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {selectedKyc.status === "pending" && (
                <div className="space-y-3 pt-3 border-t">
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Note admin (obligatoire en cas de refus)..."
                    className="text-xs"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-1.5" onClick={() => handleDecision(selectedKyc, selectedType, "approved")} disabled={processing}>
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
                        handleDecision(selectedKyc, selectedType, "rejected");
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
                <div className="p-3 rounded-lg bg-muted/50 text-xs">
                  <span className="text-muted-foreground font-medium">Note admin :</span> {selectedKyc.admin_note}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-screen image zoom */}
      <Dialog open={!!zoomImage} onOpenChange={(o) => { if (!o) setZoomImage(null); }}>
        <DialogContent className="max-w-4xl p-2">
          {zoomImage && (
            <img src={zoomImage} alt="Document KYC" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* KYC audit journal */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4" /> Journal des décisions KYC
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune décision enregistrée.</p>
            ) : (
              auditLog.map((row) => (
                <div key={row.id} className="p-3 rounded-lg border border-border text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {row.kyc_type === "driver"
                        ? <Truck className="w-3 h-3 text-muted-foreground" />
                        : <Store className="w-3 h-3 text-muted-foreground" />}
                      <span className="font-medium">{profiles[row.user_id]?.full_name || row.user_id.slice(0, 8)}</span>
                      {statusBadge(row.decision)}
                    </div>
                    <span className="text-muted-foreground">{new Date(row.created_at).toLocaleString("fr-FR")}</span>
                  </div>
                  <p className="text-muted-foreground">
                    Admin: <span className="font-mono">{row.admin_id.slice(0, 8)}…</span>
                    {row.email_idempotency_key && <> · Email key: <span className="font-mono">{row.email_idempotency_key}</span></>}
                  </p>
                  {row.reason && (
                    <p><span className="text-muted-foreground">Motif :</span> {row.reason}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KYCManager;
