import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateDemand } from "@/hooks/useDemands";
import { useToast } from "@/hooks/use-toast";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { HandCoins, Loader2, MapPin, Camera, X } from "lucide-react";

interface CreateDemandModalProps {
  trigger?: React.ReactNode;
}

const CreateDemandModal = ({ trigger }: CreateDemandModalProps) => {
  const { data: marketplaceCategories = [] } = useCategories();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const { mutate: createDemand, isPending } = useCreateDemand();
  const { toast } = useToast();

  // Auto-detect location on open
  useEffect(() => {
    if (open && !location) {
      detectLocation();
    }
  }, [open]);

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { lat, lng } = { lat: position.coords.latitude, lng: position.coords.longitude };
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`);
          const data = await res.json();
          const quarter = data.address?.suburb || data.address?.neighbourhood || "";
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state || "";
          const country = data.address?.country || "";
          const parts = [quarter, city, country].filter(Boolean);
          setLocation(parts.join(", "));
        } catch {
          // silent fail
        }
        setDetectingLocation(false);
      },
      () => setDetectingLocation(false),
      { timeout: 10000 }
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Max 5 Mo", variant: "destructive" });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    setUploadingImage(true);
    try {
      const ext = imageFile.name.split(".").pop() || "jpg";
      const path = `demands/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, imageFile, { contentType: imageFile.type });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      return data.publicUrl;
    } catch (err: any) {
      toast({ title: "Erreur upload", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!title || !category) {
      toast({ title: "Erreur", description: "Titre et catégorie requis", variant: "destructive" });
      return;
    }

    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await uploadImage();
    }

    createDemand(
      {
        title,
        description,
        category,
        quantity: quantity ? Number(quantity) : undefined,
        unit,
        budget: budget ? Number(budget) : undefined,
        location,
        image_url: imageUrl || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Demande publiée !", description: "Les fournisseurs de cette catégorie seront notifiés." });
          setOpen(false);
          setTitle(""); setDescription(""); setCategory(""); setQuantity(""); setBudget(""); setLocation("");
          setImageFile(null); setImagePreview(null);
        },
        onError: (err: any) => {
          toast({ title: "Erreur", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0 whitespace-nowrap">
            <HandCoins className="w-3 h-3 sm:w-3.5 sm:h-3.5" />Exprimer un besoin
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <HandCoins className="w-4 h-4 text-primary" />
            Exprimer un besoin d'achat
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs">Titre *</Label>
            <Input placeholder="Ex: Recherche maïs jaune en gros" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-xs mt-1" />
          </div>

          {/* Image upload */}
          <div>
            <Label className="text-xs">Photo du produit recherché</Label>
            <div className="mt-1">
              {imagePreview ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                  <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Camera className="w-5 h-5 text-muted-foreground mb-1" />
                  <span className="text-[10px] text-muted-foreground">Ajouter une photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Textarea placeholder="Décrivez votre besoin en détail..." value={description} onChange={(e) => setDescription(e.target.value)} className="text-xs mt-1 min-h-[60px]" />
          </div>
          <div>
            <Label className="text-xs">Catégorie *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-xs mt-1"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>
                {marketplaceCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name} className="text-xs">{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Quantité</Label>
              <Input type="number" placeholder="100" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-9 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Unité</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["kg", "tonne", "unité", "litre", "sac"].map(u => (
                    <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Budget (FCFA)</Label>
              <Input type="number" placeholder="50000" value={budget} onChange={(e) => setBudget(e.target.value)} className="h-9 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Localisation
              </Label>
              <div className="relative mt-1">
                <Input
                  placeholder={detectingLocation ? "Détection..." : "Votre ville"}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-9 text-xs pr-8"
                />
                <button
                  type="button"
                  onClick={detectLocation}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
                  title="Détecter ma position"
                >
                  {detectingLocation ? (
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  ) : (
                    <MapPin className="w-3 h-3 text-primary" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={isPending || uploadingImage} className="w-full h-9 text-xs gap-1.5">
            {(isPending || uploadingImage) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HandCoins className="w-3.5 h-3.5" />}
            Publier ma demande
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDemandModal;
