import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Save, Loader2, Navigation, Home, Building, ArrowLeft, Plus, Trash2, Star, Edit2, Search, X } from "lucide-react";
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

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    road?: string;
    neighbourhood?: string;
    country?: string;
    quarter?: string;
  };
}

function LocationPicker({ position, onPositionChange }: { position: [number, number]; onPositionChange: (pos: [number, number]) => void }) {
  useMapEvents({ click(e) { onPositionChange([e.latlng.lat, e.latlng.lng]); } });
  return <Marker position={position} />;
}

function MapRecenter({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(position, 15); }, [position, map]);
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
  const [geolocating, setGeolocating] = useState(false);

  // Form state
  const [addressLabel, setAddressLabel] = useState("Domicile");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Togo");
  const [city, setCity] = useState("");
  const [quarter, setQuarter] = useState("");
  const [street, setStreet] = useState("");
  const [position, setPosition] = useState<[number, number]>([6.1725, 1.2314]);

  // Address search
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [detectedAddress, setDetectedAddress] = useState("");

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

  // Reverse geocode a position to get address details
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=fr`
      );
      const data = await res.json();
      if (data?.address) {
        const addr = data.address;
        const detectedCity = addr.city || addr.town || addr.village || addr.state || "";
        const detectedCountry = addr.country || "Togo";
        const detectedQuarter = addr.suburb || addr.neighbourhood || addr.quarter || "";
        const detectedStreet = addr.road || "";

        if (detectedCity) setCity(detectedCity);
        if (detectedQuarter) setQuarter(detectedQuarter);
        if (detectedStreet) setStreet(detectedStreet);

        // Try to match country
        const matchedCountry = countries.find(c => detectedCountry.toLowerCase().includes(c.toLowerCase()));
        if (matchedCountry) setCountry(matchedCountry);

        const fullAddr = data.display_name || "";
        setDetectedAddress(fullAddr);
        return fullAddr;
      }
    } catch (e) {
      console.error("Reverse geocode error:", e);
    }
    return "";
  };

  // Auto-geolocate on form open
  const autoGeolocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(newPos);
        await reverseGeocode(newPos[0], newPos[1]);
        setGeolocating(false);
        toast({ title: "📍 Position détectée automatiquement" });
      },
      () => {
        setGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Search addresses with Nominatim
  const searchAddresses = async (query: string) => {
    if (query.length < 3) { setSuggestions([]); return; }
    setSearchingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&accept-language=fr&countrycodes=tg,bj,gh,ci,bf,ne,ml,sn`
      );
      const data: AddressSuggestion[] = await res.json();
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    }
    setSearchingAddress(false);
  };

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchAddresses(value), 500);
  };

  // Select a suggestion
  const selectSuggestion = (suggestion: AddressSuggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    setPosition([lat, lng]);
    setSuggestions([]);
    setSearchQuery("");
    setDetectedAddress(suggestion.display_name);

    if (suggestion.address) {
      const addr = suggestion.address;
      const sugCity = addr.city || addr.town || addr.village || "";
      if (sugCity) setCity(sugCity);
      if (addr.suburb || addr.neighbourhood || addr.quarter) setQuarter(addr.suburb || addr.neighbourhood || addr.quarter || "");
      if (addr.road) setStreet(addr.road);
      const matchedCountry = countries.find(c => (addr.country || "").toLowerCase().includes(c.toLowerCase()));
      if (matchedCountry) setCountry(matchedCountry);
    }
  };

  // When map is clicked, reverse geocode
  const handlePositionChange = async (pos: [number, number]) => {
    setPosition(pos);
    await reverseGeocode(pos[0], pos[1]);
  };

  const resetForm = () => {
    setAddressLabel("Domicile");
    setFullName(profile?.full_name || "");
    setPhone("");
    setCountry("Togo");
    setCity("");
    setQuarter("");
    setStreet("");
    setPosition([6.1725, 1.2314]);
    setEditingId(null);
    setDetectedAddress("");
    setSearchQuery("");
    setSuggestions([]);
  };

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
    // Auto-detect location
    setTimeout(autoGeolocate, 300);
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
    setDetectedAddress("");
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast({ title: "Géolocalisation non disponible", variant: "destructive" });
      return;
    }
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(newPos);
        await reverseGeocode(newPos[0], newPos[1]);
        setGeolocating(false);
        toast({ title: "📍 Position mise à jour" });
      },
      () => {
        setGeolocating(false);
        toast({ title: "Impossible d'obtenir votre position", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
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
              {/* Auto-detected location banner */}
              {geolocating && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-primary font-medium">Détection de votre position en cours...</span>
                </div>
              )}
              {detectedAddress && !geolocating && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary mb-0.5">📍 Adresse détectée</p>
                    <p className="text-xs text-foreground leading-relaxed">{detectedAddress}</p>
                  </div>
                  <button onClick={() => setDetectedAddress("")} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Address search bar */}
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <Label className="text-xs font-semibold mb-2 block">🔍 Rechercher une adresse</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Tapez une adresse, quartier, ville..."
                      className="pl-10 text-sm h-10"
                    />
                    {searchingAddress && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {/* Suggestions dropdown */}
                  {suggestions.length > 0 && (
                    <div className="mt-2 border border-border rounded-lg overflow-hidden bg-card shadow-lg">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => selectSuggestion(s)}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                        >
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-foreground leading-relaxed">{s.display_name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

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
                        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Lomé, Kara..." className="text-sm h-10" list="city-list" />
                        <datalist id="city-list">
                          {cities.map(c => <option key={c} value={c} />)}
                        </datalist>
                      </div>
                    </div>
                    <div><Label className="text-xs font-semibold mb-1.5">Quartier</Label>
                      <Input value={quarter} onChange={(e) => setQuarter(e.target.value)} placeholder="Ex: Bè, Adidogomé, Tokoin..." className="text-sm h-10" /></div>
                    <div><Label className="text-xs font-semibold mb-1.5">Rue / Repère</Label>
                      <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Rue, à côté de..." className="text-sm h-10" /></div>
                  </div>
                </CardContent>
              </Card>

              {/* Map with geolocation */}
              <Card>
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>📍 Localisation en temps réel</span>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={handleLocateMe} disabled={geolocating}>
                      {geolocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                      Ma position
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <div className="w-full h-52 sm:h-72 rounded-xl overflow-hidden border border-border">
                    <MapContainer center={position} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
                      <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <LocationPicker position={position} onPositionChange={handlePositionChange} />
                      <MapRecenter position={position} />
                    </MapContainer>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-muted-foreground">📌 Lat: {position[0].toFixed(5)}, Lng: {position[1].toFixed(5)}</p>
                    <p className="text-[10px] text-primary font-medium">Cliquez sur la carte pour ajuster</p>
                  </div>
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
