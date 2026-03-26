import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Save, Loader2, Navigation, Home, Building, ArrowLeft, Plus, Trash2, Star, Edit2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const cities = [
  "Lomé", "Kara", "Sokodé", "Kpalimé", "Atakpamé", "Dapaong", "Tsévié", "Notsé",
  "Aného", "Mango", "Bassar", "Sotouboua", "Badou", "Tabligbo", "Vogan",
];

const countries = [
  "Togo", "Bénin", "Ghana", "Côte d'Ivoire", "Burkina Faso", "Niger", "Mali", "Sénégal",
];

interface DeliveryAddr {
  id: string;
  label: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  quarter: string | null;
  street: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
}

function LocationPicker({ position, onPositionChange }: { position: [number, number]; onPositionChange: (pos: [number, number]) => void }) {
  useMapEvents({ click(e) { onPositionChange([e.latlng.lat, e.latlng.lng]); } });
  return <Marker position={position} />;
}

function MapRecenter({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(position, 13); }, [position, map]);
  return null;
}

const DeliveryAddress = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useProfile();

  const [addresses, setAddresses] = useState<DeliveryAddr[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [addressLabel, setAddressLabel] = useState("Domicile");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Togo");
  const [city, setCity] = useState("");
  const [quarter, setQuarter] = useState("");
  const [street, setStreet] = useState("");
  const [position, setPosition] = useState<[number, number]>([6.1725, 1.2314]);

  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("delivery_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false });
    setAddresses((data as any) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const resetForm = () => {
    setAddressLabel("Domicile");
    setFullName(profile?.full_name || "");
    setPhone(profile?.phone || "");
    setCountry("Togo");
    setCity("");
    setQuarter("");
    setStreet("");
    setPosition([6.1725, 1.2314]);
    setEditingId(null);
  };

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (addr: DeliveryAddr) => {
    setEditingId(addr.id);
    setAddressLabel(addr.label);
    setFullName(addr.full_name || "");
    setPhone(addr.phone || "");
    setCountry(addr.country || "Togo");
    setCity(addr.city || "");
    setQuarter(addr.quarter || "");
    setStreet(addr.street || "");
    setPosition([addr.lat || 6.1725, addr.lng || 1.2314]);
    setShowForm(true);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast({ title: "Géolocalisation non disponible", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setPosition([pos.coords.latitude, pos.coords.longitude]); toast({ title: "Position mise à jour ✓" }); },
      () => toast({ title: "Impossible d'obtenir votre position", variant: "destructive" })
    );
  };

  const handleSave = async () => {
    if (!user) return;
    if (!city.trim() || !phone.trim()) {
      toast({ title: "Champs requis", description: "Ville et téléphone obligatoires.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        user_id: user.id,
        label: addressLabel,
        full_name: fullName,
        phone,
        city,
        quarter,
        street,
        country,
        lat: position[0],
        lng: position[1],
        is_default: addresses.length === 0,
      };

      if (editingId) {
        const { error } = await supabase.from("delivery_addresses").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("delivery_addresses").insert(payload);
        if (error) throw error;
      }

      toast({ title: editingId ? "Adresse modifiée ✓" : "Adresse ajoutée ✓" });
      setShowForm(false);
      resetForm();
      fetchAddresses();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("delivery_addresses").delete().eq("id", id);
    if (!error) {
      toast({ title: "Adresse supprimée" });
      fetchAddresses();
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    // Remove default from all
    await supabase.from("delivery_addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("delivery_addresses").update({ is_default: true }).eq("id", id);
    toast({ title: "Adresse par défaut mise à jour ✓" });
    fetchAddresses();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-12 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Connectez-vous</h1>
          <p className="text-muted-foreground mb-4">Vous devez être connecté pour gérer vos adresses.</p>
          <Button variant="hero" onClick={() => navigate("/auth")}>Se connecter</Button>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />
      <main className="pt-4 sm:pt-8 pb-8">
        <div className="container mx-auto px-3 sm:px-4 max-w-3xl">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /><span>Retour</span>
          </button>

          <div className="flex items-center justify-between mb-5">
            <h1 className="font-heading text-lg sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Mes adresses de livraison
            </h1>
            {!showForm && (
              <Button size="sm" className="gap-1.5" onClick={openNewForm}>
                <Plus className="w-4 h-4" /> Ajouter
              </Button>
            )}
          </div>

          {/* Saved addresses list */}
          {!showForm && (
            <>
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : addresses.length === 0 ? (
                <Card className="text-center py-10">
                  <CardContent>
                    <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm mb-4">Aucune adresse enregistrée</p>
                    <Button onClick={openNewForm} className="gap-2"><Plus className="w-4 h-4" /> Ajouter une adresse</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <Card key={addr.id} className={`relative ${addr.is_default ? "border-primary/50 bg-primary/5" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {addr.label === "Domicile" ? <Home className="w-4 h-4 text-primary" /> : addr.label === "Bureau" ? <Building className="w-4 h-4 text-primary" /> : <MapPin className="w-4 h-4 text-primary" />}
                              <span className="font-semibold text-sm">{addr.label}</span>
                              {addr.is_default && (
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Par défaut</span>
                              )}
                            </div>
                            <p className="text-sm text-foreground">{addr.full_name}</p>
                            <p className="text-xs text-muted-foreground">{addr.phone}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {[addr.quarter, addr.street, addr.city, addr.country].filter(Boolean).join(", ")}
                            </p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            {!addr.is_default && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSetDefault(addr.id)} title="Définir par défaut">
                                <Star className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(addr)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(addr.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Add/Edit form */}
          {showForm && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm">{editingId ? "Modifier l'adresse" : "Nouvelle adresse"}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <div className="flex gap-2 mb-4">
                    {([{ value: "Domicile", icon: Home }, { value: "Bureau", icon: Building }, { value: "Autre", icon: MapPin }] as const).map((type) => (
                      <button key={type.value} onClick={() => setAddressLabel(type.value)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all text-sm ${
                          addressLabel === type.value ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/40 text-foreground"
                        }`}>
                        <type.icon className="w-4 h-4" />{type.value}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><Label className="text-xs font-semibold mb-1.5">Nom complet</Label>
                        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Votre nom" className="text-sm h-10" /></div>
                      <div><Label className="text-xs font-semibold mb-1.5">Téléphone</Label>
                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+228 XX XX XX XX" className="text-sm h-10" /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><Label className="text-xs font-semibold mb-1.5">Pays</Label>
                        <Select value={country} onValueChange={setCountry}>
                          <SelectTrigger className="text-sm h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>{countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select></div>
                      <div><Label className="text-xs font-semibold mb-1.5">Ville</Label>
                        <Select value={city} onValueChange={setCity}>
                          <SelectTrigger className="text-sm h-10"><SelectValue placeholder="Choisir une ville" /></SelectTrigger>
                          <SelectContent>{cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select></div>
                    </div>
                    <div><Label className="text-xs font-semibold mb-1.5">Quartier</Label>
                      <Input value={quarter} onChange={(e) => setQuarter(e.target.value)} placeholder="Ex: Bè, Adidogomé, Tokoin..." className="text-sm h-10" /></div>
                    <div><Label className="text-xs font-semibold mb-1.5">Rue / Repère</Label>
                      <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Rue, à côté de..." className="text-sm h-10" /></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>📍 Localisation</span>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={handleLocateMe}>
                      <Navigation className="w-3 h-3" /> Ma position
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <div className="w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-border">
                    <MapContainer center={position} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                      <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <LocationPicker position={position} onPositionChange={setPosition} />
                      <MapRecenter position={position} />
                    </MapContainer>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">📌 Lat: {position[0].toFixed(4)}, Lng: {position[1].toFixed(4)}</p>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setShowForm(false); resetForm(); }}>Annuler</Button>
                <Button onClick={handleSave} disabled={isSaving} className="flex-1 gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingId ? "Modifier" : "Enregistrer"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default DeliveryAddress;
