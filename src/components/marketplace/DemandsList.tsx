import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDemands, type Demand } from "@/hooks/useDemands";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, MessageCircle, Loader2, User, Package } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface DemandsListProps {
  category?: string;
  limit?: number;
  searchQuery?: string;
}

const DemandsList = ({ category, limit, searchQuery }: DemandsListProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: demands, isLoading } = useDemands(category);
  const { formatPrice } = useLanguage();
  const [offerValues, setOfferValues] = useState<Record<string, string>>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const openDemandConversation = async (demand: Demand, mode: "chat" | "offer") => {
    const offerQuantity = offerValues[demand.id]?.trim();

    if (mode === "offer" && !offerQuantity) {
      toast({
        title: "Quantité requise",
        description: "Indiquez d'abord la quantité disponible avant d'envoyer votre proposition.",
        variant: "destructive",
      });
      return;
    }

    setPendingAction(`${demand.id}-${mode}`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      const { data: myProfile, error: myProfileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("user_id", session.user.id)
        .single();

      if (myProfileError || !myProfile) {
        throw new Error("Profil introuvable");
      }

      if (myProfile.id === demand.profile_id) {
        toast({
          title: "Action impossible",
          description: "Vous ne pouvez pas répondre à votre propre demande.",
          variant: "destructive",
        });
        return;
      }

      const { data: existingConversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("buyer_id", demand.profile_id)
        .eq("seller_id", myProfile.id)
        .maybeSingle();

      let conversationId = existingConversation?.id;

      if (!conversationId) {
        const { data: newConversation, error: conversationError } = await supabase
          .from("conversations")
          .insert({
            buyer_id: demand.profile_id,
            seller_id: myProfile.id,
            product_id: null,
          })
          .select("id")
          .single();

        if (conversationError) throw conversationError;
        conversationId = newConversation.id;
      }

      const introMessage = [
        `DEMANDE D'ACHAT — ${demand.title}`,
        mode === "offer"
          ? `Bonjour, je peux proposer ${offerQuantity} ${demand.unit || "unité"} pour répondre à votre demande.`
          : `Bonjour, je vous contacte au sujet de votre demande d'achat.`,
        demand.description ? `Détail du besoin : ${demand.description}` : null,
        demand.location ? `Zone demandée : ${demand.location}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const { error: messageError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: myProfile.id,
        content: introMessage,
      });

      if (messageError) throw messageError;

      toast({
        title: mode === "offer" ? "Proposition envoyée" : "Discussion ouverte",
        description: mode === "offer"
          ? "Votre quantité disponible a été envoyée au demandeur."
          : "Vous pouvez maintenant discuter avec le demandeur.",
      });

      navigate(`/messages?conversation=${conversationId}`);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'ouvrir la discussion pour le moment.",
        variant: "destructive",
      });
    } finally {
      setPendingAction(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  let items = demands || [];
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    items = items.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      d.profile?.full_name?.toLowerCase().includes(q)
    );
  }
  if (limit) items = items.slice(0, limit);

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {items.map((demand) => (
        <Card key={demand.id} className="overflow-hidden hover:shadow-md transition-all flex flex-col">
          <CardContent className="p-3 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              {(demand as any).image_url ? (
                <img src={(demand as any).image_url} alt="" className="w-10 h-10 object-cover flex-shrink-0 rounded border border-border" />
              ) : (
                <div className="w-8 h-8 bg-accent/20 rounded flex items-center justify-center flex-shrink-0">
                  {demand.profile?.avatar_url ? (
                    <img src={demand.profile.avatar_url} alt="" className="w-full h-full object-cover rounded" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-accent-foreground" />
                  )}
                </div>
              )}
              <span className="text-[10px] font-medium text-foreground truncate">{demand.profile?.full_name || "Utilisateur"}</span>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <Badge className="bg-accent text-accent-foreground text-[9px] px-1.5 py-0 font-bold">
                    ACHAT
                  </Badge>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{demand.category}</Badge>
                </div>

                <h4 className="font-semibold text-xs text-foreground line-clamp-1">{demand.title}</h4>

                {demand.description && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{demand.description}</p>
                )}

                <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground flex-wrap">
                  <span className="font-medium text-foreground">{demand.profile?.full_name || "Utilisateur"}</span>
                  {demand.quantity && <span>• {demand.quantity} {demand.unit}</span>}
                  {demand.budget && <span>• Budget : {formatPrice(demand.budget)}</span>}
                  {demand.location && <span className="flex items-center gap-0.5"><MapPin className="w-2 h-2" />{demand.location}</span>}
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-8 gap-1 flex-1"
                      onClick={() => openDemandConversation(demand, "chat")}
                      disabled={pendingAction === `${demand.id}-chat`}
                    >
                      {pendingAction === `${demand.id}-chat` ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <MessageCircle className="w-3 h-3" />
                      )}
                      Discuter
                    </Button>

                    <div className="flex gap-2 flex-[1.2]">
                      <Input
                        value={offerValues[demand.id] || ""}
                        onChange={(event) => setOfferValues((prev) => ({ ...prev, [demand.id]: event.target.value }))}
                        placeholder={`Qté dispo (${demand.unit || "unité"})`}
                        className="h-8 text-[10px]"
                        inputMode="numeric"
                      />
                      <Button
                        size="sm"
                        className="text-[10px] h-8 gap-1 whitespace-nowrap"
                        onClick={() => openDemandConversation(demand, "offer")}
                        disabled={pendingAction === `${demand.id}-offer`}
                      >
                        {pendingAction === `${demand.id}-offer` ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Package className="w-3 h-3" />
                        )}
                        Proposer
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DemandsList;
