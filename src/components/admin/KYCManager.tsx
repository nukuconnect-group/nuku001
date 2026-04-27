import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, XCircle, Clock, FileText, Loader2, Eye, User, ShieldCheck, Truck, Store,
  ZoomIn,
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

const KYCManager = () => {
  const { toast } = useToast();
  const [driverSubs, setDriverSubs] = useState<any[]>([]);
  const [supplierSubs, setSupplierSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<"driver" | "supplier">("driver");
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [zoomImage, setZoomImage] = useState<string | null>(null);

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
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

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

      toast({
        title: decision === "approved" ? "KYC approuvé ✓" : "KYC refusé",
        description: decision === "approved"
          ? type === "supplier" ? "Le fournisseur est maintenant vérifié avec le badge." : "Le livreur a été activé."
          : "L'utilisateur a été notifié du refus.",
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
    const pending = submissions.filter((s) => s.status === "pending");
    return (
      <div className="space-y-2">
        {pending.length > 0 && (
          <Badge className="bg-yellow-100 text-yellow-800 text-[10px] mb-2">{pending.length} en attente</Badge>
        )}
        {submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucune soumission</p>
        ) : (
          submissions.map((kyc) => {
            const profile = profiles[kyc.user_id];
            return (
              <div key={kyc.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{profile?.full_name || (type === "driver" ? "Livreur" : "Fournisseur")}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {kyc.id_type?.toUpperCase()} • {kyc.id_number || "—"} • {new Date(kyc.created_at).toLocaleDateString("fr-FR")}
                      {type === "supplier" && kyc.business_name ? ` • ${kyc.business_name}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(kyc.status)}
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => { setSelectedKyc(kyc); setSelectedType(type); setAdminNote(kyc.admin_note || ""); }}>
                    <Eye className="w-3 h-3" /> Voir
                  </Button>
                </div>
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Vérifications KYC
          </CardTitle>
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
                  <div className="flex items-center gap-2 mt-1">{statusBadge(selectedKyc.status)}</div>
                </div>
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
    </div>
  );
};

export default KYCManager;
