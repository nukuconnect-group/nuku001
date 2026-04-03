import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Truck, Star, MapPin, Clock, Users, Loader2, ChevronRight, Link2, MessageCircle, Phone, Send, User } from "lucide-react";
import DriverDetailSheet from "./DriverDetailSheet";
import { toast } from "sonner";

interface Props {
  city: string;
  distanceKm: number | null;
  cartItems?: Array<{ name: string; id: string; quantity: number; price: number }>;
  selectedDriverId?: string | null;
  onSelectDriver?: (driver: Driver | null) => void;
}

interface Driver {
  id: string;
  vehicle_type: string;
  rating: number;
  total_deliveries: number;
  zone: string;
  current_lat?: number;
  current_lng?: number;
  license_plate?: string;
  profile?: { full_name: string; avatar_url: string; phone?: string };
}

const demoDrivers: Driver[] = [
  { id: "demo-1", vehicle_type: "moto", rating: 4.8, total_deliveries: 127, zone: "Lomé Centre", profile: { full_name: "Kodjo Mensah", avatar_url: "", phone: "+22890123456" } },
  { id: "demo-2", vehicle_type: "voiture", rating: 4.6, total_deliveries: 89, zone: "Adidogomé", profile: { full_name: "Ama Koffi", avatar_url: "", phone: "+22891234567" } },
  { id: "demo-3", vehicle_type: "moto", rating: 4.9, total_deliveries: 215, zone: "Bè", profile: { full_name: "Yao Agbeko", avatar_url: "", phone: "+22892345678" } },
];

const AvailableDrivers = ({ city, distanceKm, cartItems = [], selectedDriverId = null, onSelectDriver }: Props) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailDriver, setDetailDriver] = useState<Driver | null>(null);
  
  // Inline chat state
  const [chatDriver, setChatDriver] = useState<Driver | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; content: string; time: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  useEffect(() => {
    if (!city) { setDrivers([]); return; }
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("driver_profiles" as any)
        .select("id, vehicle_type, rating, total_deliveries, zone, profile_id")
        .eq("is_available", true)
        .limit(5);

      if (data && data.length > 0) {
        const profileIds = (data as any[]).map(d => d.profile_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", profileIds);

        // Get phone numbers for drivers
        const userIds = (profiles || []).map(p => p.id);
        const { data: privateData } = await supabase
          .from("profile_private" as any)
          .select("user_id, phone");

        const enriched = (data as any[]).map(d => {
          const prof = (profiles || []).find(p => p.id === d.profile_id);
          const privInfo = (privateData || []).find((pd: any) => pd.user_id === d.user_id);
          return {
            ...d,
            profile: prof ? { ...prof, phone: (privInfo as any)?.phone || "" } : undefined,
          };
        });
        setDrivers(enriched);
      } else {
        setDrivers(demoDrivers);
      }
      setLoading(false);
    };
    load();
  }, [city]);

  if (!city) return null;

  const estimateTime = (km: number | null) => {
    if (!km) return "~30 min";
    if (km < 3) return "~10 min";
    if (km < 7) return `~${Math.round(km * 3)} min`;
    if (km < 15) return `~${Math.round(km * 2.5)} min`;
    if (km < 50) return `~${Math.round(km * 2)} min`;
    return `~${Math.round(km * 1.5)} min`;
  };

  const vehicleLabels: Record<string, string> = {
    moto: "🏍️ Moto",
    voiture: "🚗 Voiture",
    velo: "🚲 Vélo",
    camion: "🚛 Camion",
  };

  const handleInlineChat = (driver: Driver) => {
    const productSummary = cartItems.length > 0
      ? cartItems.map(p => `• ${p.name} (x${p.quantity})`).join("\n")
      : "Produits du panier";
    
    setChatDriver(driver);
    setChatMessages([
      {
        sender: "system",
        content: `Discussion avec ${driver.profile?.full_name || "Livreur"} — ${vehicleLabels[driver.vehicle_type] || driver.vehicle_type}`,
        time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setChatInput(`Bonjour ${driver.profile?.full_name || ""} 👋, je souhaite organiser la livraison de :\n${productSummary}\nDistance : ${distanceKm ? distanceKm.toFixed(1) + " km" : "à définir"}`);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !chatDriver) return;
    setSendingChat(true);
    
    const newMsg = {
      sender: "me",
      content: chatInput.trim(),
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages(prev => [...prev, newMsg]);
    const messageContent = chatInput.trim();
    setChatInput("");

    try {
      if (!chatDriver.id.startsWith("demo-")) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: myProfile } = await supabase.from("profiles").select("id").eq("user_id", session.user.id).single();
          if (myProfile) {
            const { data: driverData } = await supabase.from("driver_profiles").select("profile_id").eq("id", chatDriver.id).single();
            const sellerId = driverData?.profile_id || myProfile.id;
            
            const { data: existing } = await supabase.from("conversations").select("id")
              .eq("buyer_id", myProfile.id).eq("seller_id", sellerId).maybeSingle();
            
            let conversationId = existing?.id;
            if (!conversationId) {
              const { data: newConv } = await supabase.from("conversations")
                .insert({ buyer_id: myProfile.id, seller_id: sellerId })
                .select("id").single();
              conversationId = newConv?.id;
            }
            if (conversationId) {
              await supabase.from("messages").insert({
                conversation_id: conversationId,
                sender_id: myProfile.id,
                content: messageContent,
              });
            }
          }
        }
      }
      
      // Simulate driver response for better UX
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          sender: "driver",
          content: "Merci pour votre message ! Je suis disponible pour cette livraison. 🚚",
          time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        }]);
      }, 1500);
    } catch (err) {
      console.error("Chat error:", err);
    }
    setSendingChat(false);
  };

  const handleCallDriver = (driver: Driver) => {
    const phone = driver.profile?.phone;
    if (phone) {
      window.location.href = `tel:${phone.replace(/\s/g, "")}`;
    } else {
      toast.info("Numéro de téléphone non disponible pour ce livreur.");
    }
  };

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            Livreurs disponibles
            {drivers.length > 0 && (
              <Badge variant="secondary" className="text-[9px]">{drivers.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-1">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-4">
              <Users className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-[10px] text-muted-foreground">Aucun livreur disponible actuellement</p>
              <p className="text-[9px] text-muted-foreground">Un livreur sera automatiquement assigné</p>
            </div>
          ) : (
            <div className="space-y-2">
              {drivers.map((driver) => (
                <div key={driver.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <button
                      className={`flex-1 flex items-center gap-2.5 p-2 rounded-lg transition-colors text-left border ${
                        selectedDriverId === driver.id ? "bg-primary/5 border-primary/30" : "bg-muted/50 border-transparent hover:bg-muted"
                      }`}
                      onClick={() => {
                        onSelectDriver?.(driver);
                        setDetailDriver(driver);
                      }}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {driver.profile?.avatar_url ? (
                          <img src={driver.profile.avatar_url} alt={driver.profile.full_name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{driver.profile?.full_name || "Livreur"}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 text-accent fill-accent" />
                            {(driver.rating || 5).toFixed(1)}
                          </span>
                          <span>{vehicleLabels[driver.vehicle_type] || driver.vehicle_type}</span>
                          <span>{driver.total_deliveries || 0} courses</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {selectedDriverId === driver.id && (
                          <p className="text-[9px] font-semibold text-primary">Choisi</p>
                        )}
                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {estimateTime(distanceKm)}
                        </p>
                        {driver.zone && (
                          <p className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {driver.zone}
                          </p>
                        )}
                      </div>
                    </button>
                  </div>
                  {/* Action buttons below each driver */}
                  <div className="flex gap-1.5 pl-1">
                    <Button
                      variant={selectedDriverId === driver.id ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-[9px] gap-1 flex-1"
                      onClick={async () => {
                        onSelectDriver?.(driver);
                        if (driver.id.startsWith("demo-")) {
                          toast.success(`${driver.profile?.full_name} rattaché (démo)`);
                          return;
                        }
                        try {
                          const { data: driverData } = await supabase.from("driver_profiles").select("user_id").eq("id", driver.id).single();
                          if (driverData) {
                            const productNames = cartItems.map(p => p.name).join(", ");
                            await supabase.from("notifications").insert({
                              user_id: driverData.user_id,
                              type: "delivery",
                              title: "🚚 Nouvelle livraison assignée !",
                              description: `Livraison : ${productNames}. Distance : ${distanceKm ? distanceKm.toFixed(1) + " km" : "non définie"}. Zone : ${city}`,
                            });
                            toast.success(`${driver.profile?.full_name} notifié`);
                          }
                        } catch (err) {
                          console.error("Notification error:", err);
                          toast.success(`${driver.profile?.full_name} rattaché`);
                        }
                      }}
                    >
                      <Link2 className="w-3 h-3" />
                      Rattacher
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[9px] gap-1 flex-1"
                      onClick={() => handleInlineChat(driver)}
                    >
                      <MessageCircle className="w-3 h-3" />
                      Discuter
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[9px] gap-1"
                      onClick={() => handleCallDriver(driver)}
                    >
                      <Phone className="w-3 h-3" />
                      Appeler
                    </Button>
                  </div>
                </div>
              ))}
              <p className="text-[9px] text-muted-foreground text-center mt-1">
                Rattachez un livreur, discutez ou appelez-le directement
              </p>

              <DriverDetailSheet
                driver={detailDriver}
                open={!!detailDriver}
                onOpenChange={(open) => !open && setDetailDriver(null)}
                distanceKm={distanceKm}
                onChat={(driverId) => {
                  setDetailDriver(null);
                  const d = drivers.find(dr => dr.id === driverId);
                  if (d) handleInlineChat(d);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inline chat mini-window */}
      <Sheet open={!!chatDriver} onOpenChange={(open) => !open && setChatDriver(null)}>
        <SheetContent side="bottom" className="h-[50vh] rounded-t-2xl p-0 flex flex-col">
          <SheetHeader className="p-3 pb-2 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {chatDriver?.profile?.avatar_url ? (
                  <img src={chatDriver.profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xs">{chatDriver?.profile?.full_name || "Livreur"}</SheetTitle>
                <p className="text-[10px] text-muted-foreground">{vehicleLabels[chatDriver?.vehicle_type || ""] || ""} • {chatDriver?.zone || ""}</p>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-[9px] gap-1" onClick={() => chatDriver && handleCallDriver(chatDriver)}>
                <Phone className="w-3 h-3" />
              </Button>
            </div>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === "me" ? "justify-end" : msg.sender === "system" ? "justify-center" : "justify-start"}`}>
                {msg.sender === "system" ? (
                  <p className="text-[9px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">{msg.content}</p>
                ) : (
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 ${msg.sender === "me" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <p className="text-[11px] whitespace-pre-line">{msg.content}</p>
                    <p className={`text-[8px] mt-0.5 ${msg.sender === "me" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{msg.time}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="p-3 pt-2 border-t border-border flex gap-2 flex-shrink-0">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Votre message..."
              className="h-9 text-xs flex-1"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendChatMessage())}
            />
            <Button size="sm" className="h-9 px-3" onClick={sendChatMessage} disabled={sendingChat || !chatInput.trim()}>
              {sendingChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AvailableDrivers;
