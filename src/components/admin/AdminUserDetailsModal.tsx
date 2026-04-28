import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Phone, MapPin, Calendar, ShieldCheck, Ban, KeyRound, Send, Save, Copy, MailCheck, Sparkles } from "lucide-react";

interface AdminUser {
  user_id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  user_type?: string;
  business_name?: string;
  timezone?: string;
  availability_start?: string;
  availability_end?: string;
  is_verified?: boolean;
  avatar_url?: string;
  bio?: string;
  created_at?: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  banned_until?: string;
  subscription?: { plan?: string; status?: string; expires_at?: string };
}

interface Props {
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export default function AdminUserDetailsModal({ user, open, onClose, onUpdated }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [edit, setEdit] = useState({
    full_name: "",
    location: "",
    business_name: "",
    timezone: "",
    availability_start: "",
    availability_end: "",
    phone: "",
  });

  // Initialise edit on open
  if (user && edit.full_name === "" && open) {
    setEdit({
      full_name: user.full_name || "",
      location: user.location || "",
      business_name: user.business_name || "",
      timezone: user.timezone || "Africa/Lome",
      availability_start: user.availability_start || "08:00",
      availability_end: user.availability_end || "20:00",
      phone: user.phone || "",
    });
  }

  if (!user) return null;

  const isBanned = user.banned_until && new Date(user.banned_until) > new Date();

  const callAction = async (payload: Record<string, unknown>, label: string) => {
    setLoading(label);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        body: { ...payload, target_user_id: user.user_id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Action impossible", variant: "destructive" });
      return null;
    } finally {
      setLoading(null);
    }
  };

  const handleSendReset = async () => {
    const data = await callAction({ action: "send_password_reset" }, "reset");
    if (data) {
      setResetLink((data as any).action_link || null);
      toast({ title: "✅ Lien généré", description: "Copiez et envoyez-le à l'utilisateur." });
    }
  };

  const handleSetPassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "Mot de passe trop court", description: "Min 8 caractères", variant: "destructive" });
      return;
    }
    const data = await callAction({ action: "set_password", new_password: newPassword }, "setpwd");
    if (data) {
      toast({ title: "✅ Mot de passe modifié", description: "L'utilisateur peut se connecter." });
      setNewPassword("");
    }
  };

  const handleToggleBan = async () => {
    if (isBanned) {
      const data = await callAction({ action: "unban" }, "unban");
      if (data) {
        toast({ title: "✅ Compte réactivé" });
        onUpdated();
      }
    } else {
      if (!confirm(`Suspendre le compte de "${user.full_name}" ?`)) return;
      const data = await callAction({ action: "ban", ban_duration: "8760h" }, "ban");
      if (data) {
        toast({ title: "🚫 Compte suspendu" });
        onUpdated();
      }
    }
  };

  const handleSaveProfile = async () => {
    const data = await callAction({
      action: "update_profile",
      profile_patch: {
        full_name: edit.full_name,
        location: edit.location,
        business_name: edit.business_name,
        timezone: edit.timezone,
        availability_start: edit.availability_start,
        availability_end: edit.availability_end,
      },
      phone: edit.phone,
    }, "save");
    if (data) {
      toast({ title: "✅ Profil enregistré" });
      onUpdated();
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié" });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setResetLink(null); setNewPassword(""); setEdit({ full_name: "", location: "", business_name: "", timezone: "", availability_start: "", availability_end: "", phone: "" }); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            Détails utilisateur
            {user.is_verified && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">Vérifié</Badge>}
            {isBanned && <Badge variant="destructive" className="text-[10px]">Suspendu</Badge>}
          </DialogTitle>
          <DialogDescription className="text-xs">Consulter, modifier ou gérer ce compte</DialogDescription>
        </DialogHeader>

        {/* Profile header */}
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/10 flex-shrink-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg font-bold text-primary">
                {(user.full_name || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{user.full_name || "Sans nom"}</p>
            <p className="text-[11px] text-muted-foreground capitalize">{user.user_type}</p>
            <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-muted-foreground">
              <span>Inscrit le {user.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "—"}</span>
              {user.last_sign_in_at && <span>· Dernière connexion {new Date(user.last_sign_in_at).toLocaleDateString("fr-FR")}</span>}
            </div>
          </div>
        </div>

        {/* Read-only details */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium flex-1 truncate">{user.email || "—"}</span>
            {user.email && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copy(user.email!)}>
                <Copy className="w-3 h-3" />
              </Button>
            )}
            {user.email_confirmed_at && (
              <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300">Confirmé</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">Téléphone:</span>
            <span className="font-medium flex-1">{user.phone || "—"}</span>
            {user.phone && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copy(user.phone!)}>
                <Copy className="w-3 h-3" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">Zone:</span>
            <span className="font-medium flex-1">{user.location || "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">Plan:</span>
            <Badge variant={user.subscription?.plan === "pro" ? "default" : "outline"} className="text-[10px]">
              {user.subscription?.plan || "free"}
            </Badge>
            {user.subscription?.expires_at && (
              <span className="text-muted-foreground">expire le {new Date(user.subscription.expires_at).toLocaleDateString("fr-FR")}</span>
            )}
          </div>
        </div>

        {/* Edit profile */}
        <div className="space-y-3 pt-3 border-t border-border">
          <h3 className="text-xs font-semibold text-foreground">Modifier le profil</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Nom complet</Label>
              <Input value={edit.full_name} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Téléphone</Label>
              <Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Localisation / Zone</Label>
              <Input value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Nom de l'entreprise</Label>
              <Input value={edit.business_name} onChange={(e) => setEdit({ ...edit, business_name: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Fuseau horaire</Label>
              <Input value={edit.timezone} onChange={(e) => setEdit({ ...edit, timezone: e.target.value })} className="h-8 text-xs" placeholder="Africa/Lome" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Dispo de</Label>
                <Input type="time" value={edit.availability_start} onChange={(e) => setEdit({ ...edit, availability_start: e.target.value })} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">à</Label>
                <Input type="time" value={edit.availability_end} onChange={(e) => setEdit({ ...edit, availability_end: e.target.value })} className="h-8 text-xs" />
              </div>
            </div>
          </div>
          <Button size="sm" onClick={handleSaveProfile} disabled={loading === "save"} className="w-full h-8 gap-2 text-xs">
            {loading === "save" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Enregistrer les modifications
          </Button>
        </div>

        {/* Password & ban actions */}
        <div className="space-y-3 pt-3 border-t border-border">
          <h3 className="text-xs font-semibold text-foreground">Sécurité du compte</h3>

          <div className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSendReset}
              disabled={loading === "reset" || !user.email}
              className="w-full h-8 gap-2 text-xs"
            >
              {loading === "reset" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Générer un lien de réinitialisation du mot de passe
            </Button>
            {resetLink && (
              <div className="p-2 bg-muted rounded text-[10px] break-all">
                <p className="font-medium mb-1">Lien (à transmettre à l'utilisateur) :</p>
                <p className="text-muted-foreground">{resetLink}</p>
                <Button size="sm" variant="ghost" className="h-6 mt-1 text-[10px]" onClick={() => copy(resetLink)}>
                  <Copy className="w-3 h-3 mr-1" />Copier
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Nouveau mot de passe (8+ car.)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-8 text-xs flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleSetPassword}
              disabled={loading === "setpwd" || newPassword.length < 8}
              className="h-8 gap-2 text-xs"
            >
              {loading === "setpwd" ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3" />}
              Définir
            </Button>
          </div>

          <Button
            size="sm"
            variant={isBanned ? "outline" : "destructive"}
            onClick={handleToggleBan}
            disabled={loading === "ban" || loading === "unban"}
            className="w-full h-8 gap-2 text-xs"
          >
            {(loading === "ban" || loading === "unban") ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : isBanned ? (
              <ShieldCheck className="w-3 h-3" />
            ) : (
              <Ban className="w-3 h-3" />
            )}
            {isBanned ? "Réactiver le compte" : "Suspendre / Révoquer le compte"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
