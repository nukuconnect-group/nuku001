import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, Megaphone, Users, Store, UserCheck } from "lucide-react";

interface BroadcastNotificationProps {
  users: any[];
}

const BroadcastNotification = ({ users }: BroadcastNotificationProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<"all" | "producers" | "buyers">("all");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Erreur", description: "Le titre et le message sont requis", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      // Filter users by target
      let targetUsers = users;
      if (target === "producers") {
        targetUsers = users.filter((u: any) => u.user_type === "producer");
      } else if (target === "buyers") {
        targetUsers = users.filter((u: any) => u.user_type === "buyer");
      }

      if (targetUsers.length === 0) {
        toast({ title: "Aucun destinataire", description: "Aucun utilisateur trouvé pour cette cible", variant: "destructive" });
        setSending(false);
        return;
      }

      // Insert notifications for all targeted users
      const notifications = targetUsers.map((u: any) => ({
        user_id: u.user_id,
        type: "admin",
        title: title.trim(),
        description: message.trim(),
      }));

      // Batch insert (Supabase handles arrays)
      const { error } = await supabase.from("notifications").insert(notifications);

      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ 
          title: "Message envoyé !", 
          description: `Notification envoyée à ${targetUsers.length} utilisateur(s)` 
        });
        setTitle("");
        setMessage("");
      }
    } catch (err) {
      toast({ title: "Erreur", description: "Une erreur est survenue", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const targetLabel = target === "all" ? "tous les utilisateurs" : target === "producers" ? "les fournisseurs" : "les acheteurs";
  const targetCount = target === "all" 
    ? users.length 
    : target === "producers" 
      ? users.filter((u: any) => u.user_type === "producer").length 
      : users.filter((u: any) => u.user_type === "buyer").length;

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" />
          Envoyer une notification
        </CardTitle>
        <CardDescription className="text-[11px]">
          Envoyez un message d'information à vos utilisateurs
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
        <div className="space-y-2">
          <Label className="text-xs">Destinataires</Label>
          <Select value={target} onValueChange={(v) => setTarget(v as any)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-2"><Users className="w-3.5 h-3.5" />Tous les utilisateurs</span>
              </SelectItem>
              <SelectItem value="producers">
                <span className="flex items-center gap-2"><Store className="w-3.5 h-3.5" />Fournisseurs uniquement</span>
              </SelectItem>
              <SelectItem value="buyers">
                <span className="flex items-center gap-2"><UserCheck className="w-3.5 h-3.5" />Acheteurs uniquement</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">{targetCount} destinataire(s) ciblé(s)</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Titre du message</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Mise à jour importante" className="h-8 text-xs" />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Contenu du message</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Écrivez votre message ici..." className="text-xs min-h-[80px] resize-none" />
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-muted-foreground">
            Sera visible dans les notifications de {targetLabel}
          </p>
          <Button size="sm" onClick={handleSend} disabled={!title.trim() || !message.trim() || sending} className="gap-1.5 h-8 text-xs">
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            {sending ? "Envoi..." : "Envoyer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BroadcastNotification;
