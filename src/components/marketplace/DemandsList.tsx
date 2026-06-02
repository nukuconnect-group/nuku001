import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDemands, type Demand } from "@/hooks/useDemands";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MapPin, MessageCircle, Loader2, User, Package, X, Calendar, Rocket, History, Trash2, Edit } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import DemandBoostModal from "@/components/dashboard/DemandBoostModal";

interface DemandsListProps {
  category?: string;
  limit?: number;
  searchQuery?: string;
  /** Show only current user's demands (for buyer dashboard) */
  ownerOnly?: boolean;
  /** Compact card style for dashboard embeds */
  compact?: boolean;
  /** Open a specific demand from deep links */
  focusDemandId?: string;
}

const DemandsList = ({ category, limit, searchQuery, ownerOnly = false, compact = false, focusDemandId }: DemandsListProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { profile } = useProfile();
  const { data: demands, isLoading } = useDemands(category);
  const { formatPrice } = useLanguage();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [offerValues, setOfferValues] = useState<Record<string, string>>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [dismissedFocusId, setDismissedFocusId] = useState<string | null>(null);
  const [boostDemand, setBoostDemand] = useState<{ id: string; title: string; category: string } | null>(null);
  const [boostHistory, setBoostHistory] = useState<Array<{ id: string; created_at: string; amount: number; reason: string | null }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!focusDemandId || !demands?.length || selectedDemand?.id === focusDemandId) return;
    if (dismissedFocusId === focusDemandId) return;
    const match = demands.find((d) => d.id === focusDemandId);
    if (match) setSelectedDemand(match);
  }, [focusDemandId, demands, selectedDemand?.id, dismissedFocusId]);

  const closeSelectedDemand = () => {
    if (focusDemandId) setDismissedFocusId(focusDemandId);
    setSelectedDemand(null);
    if (searchParams.get("demandId")) {
      const next = new URLSearchParams(searchParams);
      next.delete("demandId");
      setSearchParams(next, { replace: true });
    }
  };

  // Charge l'historique des boosts quand on ouvre le détail d'une demande dont on est le propriétaire
  useEffect(() => {
    if (!selectedDemand || !profile || selectedDemand.profile_id !== profile.id) {
      setBoostHistory([]);
      return;
    }
    setHistoryLoading(true);
    supabase
      .from("token_transactions")
      .select("id,created_at,amount,reason")
      .eq("reference_id", selectedDemand.id)
      .eq("reference_type", "demand_boost")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setBoostHistory((data || []) as any);
        setHistoryLoading(false);
      });
  }, [selectedDemand?.id, profile?.id]);

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

      if (myProfileError || !myProfile) throw new Error("Profil introuvable");

      if (myProfile.id === demand.profile_id) {
        toast({ title: "Action impossible", description: "Vous ne pouvez pas répondre à votre propre demande.", variant: "destructive" });
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
          .insert({ buyer_id: demand.profile_id, seller_id: myProfile.id, product_id: null })
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
      ].filter(Boolean).join("\n");

      const { error: messageError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: myProfile.id,
        content: introMessage,
      });
      if (messageError) throw messageError;

      // Notify the demand buyer (non-blocking, don't fail the flow)
      if (demand.user_id) {
        supabase.from("notifications").insert({
          user_id: demand.user_id,
          type: "demand",
          title: mode === "offer" ? "📦 Nouvelle proposition reçue !" : "💬 Nouveau message sur votre demande",
          description: mode === "offer"
            ? `${myProfile.full_name || "Un fournisseur"} propose ${offerQuantity} ${demand.unit || "unité"} pour "${demand.title}".`
            : `${myProfile.full_name || "Un fournisseur"} vous a contacté au sujet de "${demand.title}".`,
        }).then(({ error }) => { if (error) console.warn("Notification insert failed:", error.message); });
      }

      toast({
        title: mode === "offer" ? "Proposition envoyée" : "Discussion ouverte",
        description: mode === "offer" ? "Votre quantité disponible a été envoyée au demandeur. Il a été notifié." : "Vous pouvez maintenant discuter avec le demandeur.",
      });
      setSelectedDemand(null);
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error: any) {
      toast({ title: "Erreur", description: error?.message || "Impossible d'ouvrir la discussion pour le moment.", variant: "destructive" });
    } finally {
      setPendingAction(null);
    }
  };

  const handleDeleteDemand = async (demandId: string) => {
    setDeleting(demandId);
    const { error } = await supabase.from("demands").delete().eq("id", demandId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Demande supprimée" });
      queryClient.invalidateQueries({ queryKey: ["demands"] });
    }
    setDeleting(null);
  };

  if (isLoading) {
    return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  let items = demands || [];
  // Filter to owner's demands only when in buyer dashboard
  if (ownerOnly && profile) {
    items = items.filter((d) => d.profile_id === profile.id);
  }
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

  if (items.length === 0) {
    if (ownerOnly) return <p className="text-xs text-muted-foreground text-center py-3">Aucune demande publiée.</p>;
    return null;
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Il y a ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `Il y a ${days}j`;
  };

  return (
    <>
      <div className={compact
        ? "grid grid-cols-1 gap-2"
        : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3"
      }>
        {items.map((demand) => {
          const isOwner = !!profile && demand.profile_id === profile.id;
          const isBoosted = (demand as any).is_boosted && (!(demand as any).boosted_until || new Date((demand as any).boosted_until) > new Date());

          // Compact mode: horizontal mini card for dashboard
          if (compact) {
            return (
              <div
                key={demand.id}
                className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-all"
                onClick={() => setSelectedDemand(demand)}
              >
                {(demand as any).image_url ? (
                  <img src={(demand as any).image_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-accent/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-foreground truncate">{demand.title}</p>
                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                    {demand.budget && <span className="font-medium text-primary">{formatPrice(demand.budget)}</span>}
                    {demand.quantity && <span>• {demand.quantity} {demand.unit}</span>}
                  </div>
                </div>
                {isOwner && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => { e.stopPropagation(); handleDeleteDemand(demand.id); }}
                      disabled={deleting === demand.id}
                    >
                      {deleting === demand.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3 text-destructive" />}
                    </Button>
                  </div>
                )}
              </div>
            );
          }

          // Standard card (marketplace grid)
          return (
          <Card
            key={demand.id}
            className="overflow-hidden hover:shadow-md transition-all flex flex-col cursor-pointer"
            onClick={() => setSelectedDemand(demand)}
          >
            {/* Image */}
            {(demand as any).image_url ? (
              <div className="relative w-full aspect-[4/3] bg-muted">
                <img src={(demand as any).image_url} alt={demand.title} className="absolute inset-0 w-full h-full object-cover" />
                <Badge className="absolute top-1 left-1 bg-accent text-accent-foreground text-[8px] px-1 py-0 font-bold shadow">ACHAT</Badge>
                {isBoosted && (
                  <Badge className="absolute top-1 right-1 bg-primary text-primary-foreground text-[8px] px-1 py-0 font-bold shadow flex items-center gap-0.5">
                    <Rocket className="w-2 h-2" /> BOOST
                  </Badge>
                )}
              </div>
            ) : (
              <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-accent/10 to-primary/5 flex items-center justify-center">
                <Package className="w-8 h-8 text-accent/40" />
                <Badge className="absolute top-1 left-1 bg-accent text-accent-foreground text-[8px] px-1 py-0 font-bold shadow">ACHAT</Badge>
                {isBoosted && (
                  <Badge className="absolute top-1 right-1 bg-primary text-primary-foreground text-[8px] px-1 py-0 font-bold shadow flex items-center gap-0.5">
                    <Rocket className="w-2 h-2" /> BOOST
                  </Badge>
                )}
              </div>
            )}

            <CardContent className="p-2 sm:p-3 flex-1 flex flex-col">
              <h4 className="font-semibold text-[11px] sm:text-xs text-foreground line-clamp-2 mb-1">{demand.title}</h4>

              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[8px] sm:text-[9px] text-muted-foreground mt-auto">
                {demand.quantity && <span className="whitespace-nowrap">📦 {demand.quantity} {demand.unit}</span>}
                {demand.budget && <span className="whitespace-nowrap font-medium text-primary">{formatPrice(demand.budget)}</span>}
                {demand.location && (
                  <span className="flex items-center gap-0.5 whitespace-nowrap">
                    <MapPin className="w-2 h-2 flex-shrink-0" />{demand.location}
                  </span>
                )}
              </div>

              {isOwner && (
                <div className="flex gap-1 mt-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[9px] px-1.5 gap-0.5 text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDeleteDemand(demand.id); }}
                    disabled={deleting === demand.id}
                  >
                    {deleting === demand.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
                    Suppr.
                  </Button>
                  <Button
                    size="sm"
                    variant={isBoosted ? "outline" : "hero"}
                    className="h-6 text-[9px] px-1.5 gap-0.5 ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBoostDemand({ id: demand.id, title: demand.title, category: demand.category });
                    }}
                  >
                    <Rocket className="w-2.5 h-2.5" /> Boost
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          );
        })}
      </div>

      <DemandBoostModal
        open={!!boostDemand}
        onOpenChange={(open) => { if (!open) setBoostDemand(null); }}
        presetDemand={boostDemand || undefined}
        presetDemandId={boostDemand?.id}
      />

      {/* Demand Detail Sheet */}
      <Sheet open={!!selectedDemand} onOpenChange={(open) => !open && closeSelectedDemand()}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          {selectedDemand && (
            <>
              <SheetHeader className="pb-3">
                <SheetTitle className="text-left text-base flex items-center gap-2">
                  <Package className="w-5 h-5 text-accent" />
                  Détails de la demande
                </SheetTitle>
              </SheetHeader>

              {/* Image */}
              {(selectedDemand as any).image_url && (
                <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 bg-muted">
                  <img src={(selectedDemand as any).image_url} alt={selectedDemand.title} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Requester */}
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-muted/50 border border-border">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {selectedDemand.profile?.avatar_url ? (
                    <img src={selectedDemand.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-accent-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{selectedDemand.profile?.full_name || "Utilisateur"}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {selectedDemand.profile?.location && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{selectedDemand.profile.location}</span>}
                    <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{timeAgo(selectedDemand.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="font-heading text-lg font-bold text-foreground mb-2">{selectedDemand.title}</h3>
              {selectedDemand.description && (
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{selectedDemand.description}</p>
              )}

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {selectedDemand.quantity && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Quantité</p>
                    <p className="text-sm font-bold text-foreground">{selectedDemand.quantity} {selectedDemand.unit}</p>
                  </div>
                )}
                {selectedDemand.budget && (
                  <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Budget</p>
                    <p className="text-sm font-bold text-foreground">{formatPrice(selectedDemand.budget)}</p>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Catégorie</p>
                  <p className="text-sm font-medium text-foreground">{selectedDemand.category}</p>
                </div>
                {selectedDemand.location && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Localisation</p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedDemand.location}</p>
                  </div>
                )}
              </div>

              {/* Historique des boosts (propriétaire uniquement) */}
              {profile && selectedDemand.profile_id === profile.id && (
                <div className="mb-5 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-semibold text-foreground">Historique des boosts</span>
                    </div>
                    {(selectedDemand as any).is_boosted && (selectedDemand as any).boosted_until && new Date((selectedDemand as any).boosted_until) > new Date() ? (
                      <Badge className="bg-primary text-primary-foreground text-[9px] gap-1"><Rocket className="w-2.5 h-2.5" /> Actif</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px]">Inactif</Badge>
                    )}
                  </div>
                  {(selectedDemand as any).boosted_until && (
                    <p className="text-[10px] text-muted-foreground mb-2">
                      {new Date((selectedDemand as any).boosted_until) > new Date()
                        ? `Expire le ${new Date((selectedDemand as any).boosted_until).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                        : `Dernier boost expiré le ${new Date((selectedDemand as any).boosted_until).toLocaleDateString("fr-FR")}`}
                    </p>
                  )}
                  {historyLoading ? (
                    <div className="flex justify-center py-2"><Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /></div>
                  ) : boostHistory.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic">Aucun boost effectué pour cette demande.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {boostHistory.map((tx) => {
                        const date = new Date(tx.created_at);
                        // Tente d'extraire la durée depuis la raison "Boost besoin "..." (Xj)"
                        const match = tx.reason?.match(/\((\d+)j\)/);
                        const days = match ? `${match[1]}j` : "—";
                        return (
                          <li key={tx.id} className="flex items-center justify-between gap-2 text-[10px] bg-background/60 rounded-md px-2 py-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Calendar className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                              <span className="text-foreground">
                                {date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                              <span className="text-muted-foreground">• {days}</span>
                            </div>
                            <span className="font-semibold text-primary shrink-0">−{Math.abs(tx.amount)} jeton{Math.abs(tx.amount) > 1 ? "s" : ""}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <Button
                    type="button"
                    variant="hero"
                    size="sm"
                    className="w-full mt-2 gap-1.5 h-8 text-[11px]"
                    onClick={() => setBoostDemand({ id: selectedDemand.id, title: selectedDemand.title, category: selectedDemand.category })}
                  >
                    <Rocket className="w-3 h-3" /> Booster cette demande
                  </Button>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3 pb-4">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => openDemandConversation(selectedDemand, "chat")}
                  disabled={pendingAction === `${selectedDemand.id}-chat`}
                >
                  {pendingAction === `${selectedDemand.id}-chat` ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                  Discuter avec le demandeur
                </Button>
                <div className="flex gap-2">
                  <Input
                    value={offerValues[selectedDemand.id] || ""}
                    onChange={(e) => setOfferValues((prev) => ({ ...prev, [selectedDemand.id]: e.target.value }))}
                    placeholder={`Qté disponible (${selectedDemand.unit || "unité"})`}
                    className="flex-1"
                    inputMode="numeric"
                  />
                  <Button
                    className="gap-2 flex-shrink-0"
                    onClick={() => openDemandConversation(selectedDemand, "offer")}
                    disabled={pendingAction === `${selectedDemand.id}-offer`}
                  >
                    {pendingAction === `${selectedDemand.id}-offer` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                    Proposer
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default DemandsList;
