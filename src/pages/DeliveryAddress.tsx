import { useState, useEffect } from "react";
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
import { MapPin, Save, Loader2, Navigation, Home, Building, ArrowLeft } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icon
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

function LocationPicker({ position, onPositionChange }: { position: [number, number]; onPositionChange: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onPositionChange([e.latlng.lat, e.latlng.lng]);
    },
  });
  return <Marker position={position} />;
}

const DeliveryAddress = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, updateProfile } = useProfile();

  const [addressLabel, setAddressLabel] = useState("Domicile");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Togo");
  const [city, setCity] = useState("");
  const [quarter, setQuarter] = useState("");
  const [street, setStreet] = useState("");
  const [details, setDetails] = useState("");
  const [position, setPosition] = useState<[number, number]>([6.1725, 1.2314]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      if (profile.location) {
        const parts = profile.location.split(", ");
        if (parts.length >= 2) {
          setCity(parts[0]);
          setCountry(parts[1] || "Togo");
        } else {
          setCity(profile.location);
        }
      }
    }
  }, [profile]);

  useEffect(() => {
    if (!user && !profile) return;
  }, [user, profile]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast({ title: "Géolocalisation non disponible", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        toast({ title: "Position mise à jour ✓" });
      },
      () => toast({ title: "Impossible d'obtenir votre position", variant: "destructive" })
    );
  };

  const handleSave = async () => {
    if (!profile) return;
    if (!city.trim() || !phone.trim()) {
      toast({ title: "Champs requis", description: "Veuillez remplir la ville et le téléphone.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const locationStr = `${city}, ${country}`;
      const { error } = await supabase.from("profiles").update({
        location: locationStr,
        phone,
        full_name: fullName,
      }).eq("id", profile.id);
      if (error) throw error;
      updateProfile({ location: locationStr, phone, full_name: fullName });
      toast({ title: "Adresse enregistrée ✓", description: "Votre adresse de livraison a été mise à jour." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
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

          <h1 className="font-heading text-lg sm:text-2xl font-bold text-foreground mb-5 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Adresse de livraison
          </h1>

          {/* Address type */}
          <Card className="mb-4">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-sm">Type d'adresse</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="flex gap-2">
                {[
                  { value: "Domicile", icon: Home },
                  { value: "Bureau", icon: Building },
                  { value: "Autre", icon: MapPin },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setAddressLabel(type.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all text-sm ${
                      addressLabel === type.value
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:border-primary/40 text-foreground"
                    }`}
                  >
                    <type.icon className="w-4 h-4" />
                    {type.value}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact info */}
          <Card className="mb-4">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-sm">Informations de contact</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1.5">Nom complet</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Votre nom" className="text-sm h-10" />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5">Téléphone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+228 XX XX XX XX" className="text-sm h-10" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address details */}
          <Card className="mb-4">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-sm">Détails de l'adresse</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1.5">Pays</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="text-sm h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5">Ville</Label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger className="text-sm h-10"><SelectValue placeholder="Choisir une ville" /></SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5">Quartier</Label>
                <Input value={quarter} onChange={(e) => setQuarter(e.target.value)} placeholder="Ex: Bè, Adidogomé, Tokoin..." className="text-sm h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5">Rue / Repère</Label>
                <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Rue, à côté de..." className="text-sm h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5">Informations complémentaires</Label>
                <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Étage, bâtiment, instructions de livraison..." rows={2} className="text-sm" />
              </div>
            </CardContent>
          </Card>

          {/* Interactive Map */}
          <Card className="mb-4">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>📍 Localisation sur la carte</span>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={handleLocateMe}>
                  <Navigation className="w-3 h-3" />
                  Ma position
                </Button>
              </CardTitle>
              <CardDescription className="text-[11px]">
                Cliquez sur la carte pour ajuster votre position exacte
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="w-full h-56 sm:h-72 rounded-xl overflow-hidden border border-border">
                <MapContainer center={position} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationPicker position={position} onPositionChange={setPosition} />
                </MapContainer>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                📌 Lat: {position[0].toFixed(4)}, Lng: {position[1].toFixed(4)}
              </p>
            </CardContent>
          </Card>

          {/* Save */}
          <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2" size="lg">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer l'adresse
          </Button>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default DeliveryAddress;
