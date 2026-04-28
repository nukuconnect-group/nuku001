import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CheckCircle2, XCircle, RefreshCw, Loader2, ArrowLeft, Package, ShieldCheck, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import ProductStatusBadge from "@/components/dashboard/ProductStatusBadge";

interface ModProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  images: string[] | null;
  moderation_status: string;
  moderation_reason: string | null;
  moderation_scheduled_at: string | null;
  moderated_at: string | null;
  created_at: string;
}

const Moderation = () => {
  const navigate = useNavigate();
  const { user, profile, isReady } = useProfile();
  const [products, setProducts] = useState<ModProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [resubmitting, setResubmitting] = useState<string | null>(null);

  const fetchProducts = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from("products")
      .select("id,name,category,price,unit,images,moderation_status,moderation_reason,moderation_scheduled_at,moderated_at,created_at")
      .eq("producer_id", profile.id)
      .order("created_at", { ascending: false });
    setProducts((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!isReady) return;
    if (!user) { navigate("/auth", { replace: true }); return; }
    if (profile?.user_type !== "producer") { navigate("/dashboard", { replace: true }); return; }
    fetchProducts();
    // realtime updates
    const channel = supabase
      .channel("moderation-updates")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products", filter: `producer_id=eq.${profile?.id}` }, fetchProducts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, user, profile?.id]);

  const pending = products.filter(p => p.moderation_status === "pending");
  const approved = products.filter(p => p.moderation_status === "approved");
  const rejected = products.filter(p => p.moderation_status === "rejected");

  const handleResubmit = async (productId: string) => {
    setResubmitting(productId);
    const { data, error } = await supabase.rpc("resubmit_product_moderation" as any, { p_product_id: productId });
    setResubmitting(null);
    if (error) {
      toast.error("Impossible de resoumettre : " + error.message);
      return;
    }
    const result = data as any;
    if (result?.success) {
      toast.success("Produit resoumis. Nouvelle analyse IA dans 20 minutes.");
      fetchProducts();
    }
  };

  const renderProduct = (p: ModProduct) => (
    <Card key={p.id} className="overflow-hidden">
      <CardContent className="p-3 flex gap-3">
        {p.images?.[0] ? (
          <img src={p.images[0]} alt={p.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-muted-foreground/40" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm line-clamp-1">{p.name}</h3>
            <ProductStatusBadge
              status={p.moderation_status}
              reason={p.moderation_reason}
              scheduledAt={p.moderation_scheduled_at}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {p.category} • {Number(p.price).toLocaleString("en-US")} F/{p.unit}
          </p>

          {p.moderation_status === "pending" && p.moderation_scheduled_at && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-400">
              <Clock className="w-3 h-3" />
              Publication estimée : {new Date(p.moderation_scheduled_at).toLocaleString("fr-FR", {
                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
              })}
            </div>
          )}

          {p.moderation_status === "rejected" && p.moderation_reason && (
            <div className="mt-1.5 p-2 bg-destructive/10 rounded-md border border-destructive/20">
              <p className="text-[10px] text-destructive flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span><strong>Raison du refus :</strong> {p.moderation_reason}</span>
              </p>
            </div>
          )}

          {p.moderation_status === "approved" && p.moderated_at && (
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              Approuvé le {new Date(p.moderated_at).toLocaleDateString("fr-FR")}
            </div>
          )}

          <div className="flex gap-1.5 mt-2">
            <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => navigate(`/produit/${p.id}`)}>
              Voir
            </Button>
            {p.moderation_status === "rejected" && (
              <Button
                variant="hero"
                size="sm"
                className="text-[10px] h-7 gap-1"
                onClick={() => handleResubmit(p.id)}
                disabled={resubmitting === p.id}
              >
                {resubmitting === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Resoumettre après corrections
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SEO url="/moderation" title="Modération & Traçabilité" description="Suivez l'état de modération de vos produits." noIndex />
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" size="sm" className="gap-1 mb-3" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-3.5 h-3.5" /> Retour
          </Button>

          <Card className="mb-4 bg-gradient-hero text-primary-foreground">
            <CardHeader className="p-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> Modération & Traçabilité
              </CardTitle>
              <p className="text-xs opacity-90 mt-1">
                Chaque produit est analysé par notre IA dans les 20 minutes suivant la publication.
                Suivez ici le statut de vos publications et resoumettez-les après correction si refusées.
              </p>
            </CardHeader>
          </Card>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="text-center py-10">
                <Package className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Aucun produit publié pour le moment.</p>
                <Link to="/dashboard"><Button variant="hero" size="sm" className="mt-3 text-xs">Publier un produit</Button></Link>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="pending">
              <TabsList className="w-full mb-3">
                <TabsTrigger value="pending" className="flex-1 text-xs gap-1">
                  <Clock className="w-3.5 h-3.5" /> En attente ({pending.length})
                </TabsTrigger>
                <TabsTrigger value="approved" className="flex-1 text-xs gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approuvés ({approved.length})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="flex-1 text-xs gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Rejetés ({rejected.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-2">
                {pending.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6">Aucun produit en attente.</p>
                ) : pending.map(renderProduct)}
              </TabsContent>
              <TabsContent value="approved" className="space-y-2">
                {approved.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6">Aucun produit approuvé.</p>
                ) : approved.map(renderProduct)}
              </TabsContent>
              <TabsContent value="rejected" className="space-y-2">
                {rejected.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6">Aucun produit rejeté. 🎉</p>
                ) : rejected.map(renderProduct)}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default Moderation;
