import SupportWidget from "@/components/SupportWidget";
import SEO from "@/components/SEO";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Package, ShieldCheck, RefreshCw, Bell, Truck, Clock, CheckCircle2,
  XCircle, Wallet, Settings
} from "lucide-react";
import { Link } from "react-router-dom";
import KYCForm from "@/components/driver/KYCForm";
import DriverStatusHeader from "@/components/driver/DriverStatusHeader";
import MissionCard from "@/components/driver/MissionCard";
import MissionDetailView from "@/components/driver/MissionDetailView";
import DriverEarningsPanel from "@/components/driver/DriverEarningsPanel";

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, isLoading: profileLoading, isReady } = useProfile();
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [availableDeliveries, setAvailableDeliveries] = useState<any[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [driverPosition, setDriverPosition] = useState<[number, number]>([6.1725, 1.2314]);
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("missions");

  const firstName = profile?.full_name?.split(" ")[0] || "Livreur";

  const fetchDriverData = useCallback(async () => {
    if (!user) return;
    if (!initialLoadDone) setIsLoading(true);
    try {
      let { data: dp } = await supabase
        .from("driver_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!dp && profile) {
        const { data: profileData } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
        if (profileData) {
          const { data: newDp } = await supabase.from("driver_profiles").insert({
            user_id: user.id,
            profile_id: profileData.id,
            vehicle_type: "moto",
            is_available: false,
          }).select("*").single();
          dp = newDp;
        }
      }

      setDriverProfile(dp);

      if (dp) {
        const [availRes, mineRes, wdsRes] = await Promise.all([
          supabase.from("deliveries").select("*").eq("status", "pending").is("driver_id", null).order("created_at", { ascending: false }),
          supabase.from("deliveries").select("*").eq("driver_id", (dp as any).id).order("created_at", { ascending: false }),
          supabase.from("withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        ]);
        setAvailableDeliveries(availRes.data || []);
        setMyDeliveries(mineRes.data || []);
        setWithdrawals(wdsRes.data || []);
      }
    } catch (err) {
      console.error("Error fetching driver data:", err);
    } finally {
      setIsLoading(false);
      setInitialLoadDone(true);
    }
  }, [user, profile, initialLoadDone]);

  useEffect(() => {
    if (!isReady || profileLoading) return;
    if (!user) { navigate("/auth", { replace: true }); return; }
    fetchDriverData();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setDriverPosition([pos.coords.latitude, pos.coords.longitude]),
        () => {}, { timeout: 5000 }
      );
    }
  }, [user, profileLoading, fetchDriverData, navigate, isReady]);

  // GPS tracking when available
  useEffect(() => {
    if (!driverProfile?.is_available || !driverProfile?.id) return;
    const updateGPS = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setDriverPosition([lat, lng]);
          await supabase.from("driver_profiles").update({ current_lat: lat, current_lng: lng }).eq("id", driverProfile.id);
          await supabase.from("deliveries")
            .update({ driver_current_lat: lat, driver_current_lng: lng })
            .eq("driver_id", driverProfile.id)
            .in("status", ["accepted", "picking", "picked_up", "in_transit"]);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    };
    updateGPS();
    const interval = setInterval(updateGPS, 30000);
    return () => clearInterval(interval);
  }, [driverProfile?.is_available, driverProfile?.id]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("driver-deliveries-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, () => {
        fetchDriverData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDriverData]);

  const toggleAvailability = async () => {
    if (!driverProfile) return;
    setIsToggling(true);
    try {
      const newStatus = !driverProfile.is_available;
      const updates: any = { is_available: newStatus };
      if (newStatus && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
          );
          updates.current_lat = pos.coords.latitude;
          updates.current_lng = pos.coords.longitude;
        } catch { /* ignore */ }
      }
      await supabase.from("driver_profiles").update(updates).eq("id", driverProfile.id);
      setDriverProfile({ ...driverProfile, ...updates });
      toast({
        title: newStatus ? "Vous êtes en ligne !" : "Vous êtes hors ligne",
        description: newStatus ? "Vous recevrez les nouvelles missions." : "Vous ne recevrez plus de missions.",
      });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setIsToggling(false);
    }
  };

  const acceptDelivery = async (deliveryId: string) => {
    if (!driverProfile) return;
    try {
      const { data, error } = await supabase.functions.invoke("accept-delivery", {
        body: { delivery_id: deliveryId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "✅ Mission acceptée !" });
      await fetchDriverData();
      setActiveTab("active");
    } catch (err: any) {
      toast({ title: err?.message || "Mission plus disponible", variant: "destructive" });
    }
  };

  const rejectDelivery = async (deliveryId: string) => {
    try {
      // Notify the buyer about the rejection
      const delivery = availableDeliveries.find(d => d.id === deliveryId);
      if (delivery?.order_id) {
        const { data: order } = await supabase.from("orders").select("buyer_id").eq("id", delivery.order_id).maybeSingle();
        if (order) {
          const { data: buyerProfile } = await supabase.from("profiles").select("user_id").eq("id", order.buyer_id).maybeSingle();
          if (buyerProfile) {
            await supabase.from("notifications").insert({
              user_id: buyerProfile.user_id,
              title: "❌ Livraison refusée par un livreur",
              description: `Un livreur a refusé la mission pour la commande #${delivery.order_id.slice(0, 8)}. Un autre livreur sera recherché.`,
              type: "delivery",
            });
          }
        }
      }
    } catch {}
    setAvailableDeliveries(prev => prev.filter(d => d.id !== deliveryId));
    toast({ title: "Mission refusée" });
  };

  const updateDeliveryStatus = async (deliveryId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "picked_up") updates.picked_up_at = new Date().toISOString();
      if (newStatus === "delivered") updates.delivered_at = new Date().toISOString();

      const { error } = await supabase.from("deliveries").update(updates).eq("id", deliveryId);
      if (error) throw error;

      const delivery = myDeliveries.find(d => d.id === deliveryId);
      if (delivery?.order_id) {
        const orderStatus = newStatus === "delivered" ? "completed" :
          newStatus === "in_transit" ? "shipped" :
          newStatus === "picked_up" ? "confirmed" : "pending";
        await supabase.from("orders").update({ status: orderStatus }).eq("id", delivery.order_id);
      }

      if (newStatus === "delivered" && driverProfile) {
        const fee = delivery?.driver_fee || 0;
        await supabase.from("driver_profiles").update({
          total_deliveries: (driverProfile.total_deliveries || 0) + 1,
          total_earnings: (driverProfile.total_earnings || 0) + fee,
        }).eq("id", driverProfile.id);

        // Create notification for buyer
        if (delivery?.order_id) {
          const { data: order } = await supabase.from("orders").select("buyer_id").eq("id", delivery.order_id).maybeSingle();
          if (order) {
            const { data: buyerProfile } = await supabase.from("profiles").select("user_id").eq("id", order.buyer_id).maybeSingle();
            if (buyerProfile) {
              await supabase.from("notifications").insert({
                user_id: buyerProfile.user_id,
                title: "📦 Votre commande a été livrée !",
                description: `Commande #${delivery.order_id.slice(0, 8)} livrée avec succès.`,
                type: "delivery",
              });
            }
          }
        }
      }

      toast({ title: `Statut mis à jour` });
      if (newStatus === "delivered") {
        toast({ title: `💰 +${(delivery?.driver_fee || 0).toLocaleString()} F crédités !` });
        setSelectedMission(null);
      }
      fetchDriverData();
    } catch {
      toast({ title: "Erreur de mise à jour", variant: "destructive" });
    }
  };

  const handleWithdraw = async (amount: number, phone: string, operator: string) => {
    if (!user || !profile) return;
    if (!amount || amount <= 0 || amount > availableBalance) {
      toast({ title: "Montant invalide", variant: "destructive" });
      return;
    }
    const { data: profileData } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
    if (!profileData) throw new Error("Profil introuvable");
    const { error } = await supabase.from("withdrawals").insert({
      user_id: user.id, profile_id: profileData.id, amount, phone_number: phone, operator,
    });
    if (error) throw error;
    toast({ title: "✅ Demande de retrait envoyée" });
    fetchDriverData();
  };

  // Computed stats
  const completedDeliveries = myDeliveries.filter(d => d.status === "delivered");
  const activeDeliveries = myDeliveries.filter(d => ["accepted", "picking", "picked_up", "in_transit"].includes(d.status));
  const totalEarnings = completedDeliveries.reduce((sum, d) => sum + (d.driver_fee || 0), 0);
  const totalWithdrawn = withdrawals.filter(w => w.status === "completed").reduce((sum, w) => sum + w.amount, 0);
  const availableBalance = totalEarnings - totalWithdrawn;

  const today = new Date().toDateString();
  const todayEarnings = completedDeliveries
    .filter(d => d.delivered_at && new Date(d.delivered_at).toDateString() === today)
    .reduce((sum, d) => sum + (d.driver_fee || 0), 0);

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekEarnings = completedDeliveries
    .filter(d => d.delivered_at && new Date(d.delivered_at) >= weekAgo)
    .reduce((sum, d) => sum + (d.driver_fee || 0), 0);

  const newMissions = availableDeliveries;

  if (profileLoading || (isLoading && !initialLoadDone)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <SEO url="/driver-dashboard" title="Tableau de bord Livreur" description="Gérez vos livraisons et suivez vos gains." noIndex />
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-4 space-y-4 max-w-lg">
        {/* KYC Banner */}
        {driverProfile && !driverProfile.is_approved && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Vérification requise</p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400">Soumettez vos documents pour activer votre compte</p>
                </div>
              </div>
              <KYCForm userId={user?.id} onSubmitted={fetchDriverData} />
            </CardContent>
          </Card>
        )}

        {/* Status Header */}
        <DriverStatusHeader
          firstName={firstName}
          isAvailable={driverProfile?.is_available || false}
          isToggling={isToggling}
          isApproved={driverProfile?.is_approved || false}
          activeMissions={activeDeliveries.length}
          todayEarnings={todayEarnings}
          rating={driverProfile?.rating || 5.0}
          onToggle={toggleAvailability}
        />

        {/* Mission detail view */}
        {selectedMission ? (
          <MissionDetailView
            delivery={selectedMission}
            driverPosition={driverPosition}
            onBack={() => setSelectedMission(null)}
            onStatusUpdate={updateDeliveryStatus}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-10">
              <TabsTrigger value="missions" className="text-xs relative">
                <Bell className="w-3.5 h-3.5 mr-1" />
                Nouvelles
                {newMissions.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">
                    {newMissions.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="active" className="text-xs">
                <Truck className="w-3.5 h-3.5 mr-1" />
                En cours
                {activeDeliveries.length > 0 && (
                  <span className="ml-1 text-[9px] bg-primary/20 rounded-full px-1">{activeDeliveries.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="earnings" className="text-xs">
                <Wallet className="w-3.5 h-3.5 mr-1" />
                Gains
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                <Clock className="w-3.5 h-3.5 mr-1" />
                Histo
              </TabsTrigger>
            </TabsList>

            {/* New Missions */}
            <TabsContent value="missions" className="space-y-3 mt-3">
              {!driverProfile?.is_available ? (
                <Card className="p-6 text-center">
                  <XCircle className="w-10 h-10 mx-auto text-red-400 mb-2" />
                  <p className="text-sm font-medium">Vous êtes hors ligne</p>
                  <p className="text-xs text-muted-foreground mb-3">Passez en ligne pour recevoir des missions</p>
                  <Button size="sm" onClick={toggleAvailability} disabled={isToggling}>
                    Passer en ligne
                  </Button>
                </Card>
              ) : newMissions.length === 0 ? (
                <Card className="p-6 text-center">
                  <Package className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune nouvelle mission</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={fetchDriverData}>
                    <RefreshCw className="w-4 h-4 mr-1" /> Actualiser
                  </Button>
                </Card>
              ) : (
                newMissions.map((d) => (
                  <MissionCard
                    key={d.id}
                    delivery={d}
                    type="new"
                    onAccept={acceptDelivery}
                    onReject={rejectDelivery}
                  />
                ))
              )}
            </TabsContent>

            {/* Active Missions */}
            <TabsContent value="active" className="space-y-3 mt-3">
              {activeDeliveries.length === 0 ? (
                <Card className="p-6 text-center">
                  <Truck className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune mission active</p>
                </Card>
              ) : (
                activeDeliveries.map((d) => (
                  <MissionCard
                    key={d.id}
                    delivery={d}
                    type="active"
                    onSelect={(del) => setSelectedMission(del)}
                  />
                ))
              )}
            </TabsContent>

            {/* Earnings */}
            <TabsContent value="earnings" className="mt-3">
              <DriverEarningsPanel
                totalEarnings={totalEarnings}
                totalWithdrawn={totalWithdrawn}
                availableBalance={availableBalance}
                todayEarnings={todayEarnings}
                weekEarnings={weekEarnings}
                completedCount={completedDeliveries.length}
                withdrawals={withdrawals}
                onWithdraw={handleWithdraw}
              />
            </TabsContent>

            {/* History */}
            <TabsContent value="history" className="space-y-2 mt-3">
              {completedDeliveries.length === 0 ? (
                <Card className="p-6 text-center">
                  <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune livraison terminée</p>
                </Card>
              ) : (
                completedDeliveries.map((d) => (
                  <MissionCard key={d.id} delivery={d} type="completed" />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
      <SupportWidget userId={user?.id} userName={profile?.full_name || undefined} />
      <MobileBottomNav />
    </div>
  );
};

export default DriverDashboard;
