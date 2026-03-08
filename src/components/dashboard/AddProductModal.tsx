import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useSubscription } from "@/hooks/useSubscription";
import { Plus, Loader2, Upload, X, Tag, Zap, Edit, Crown } from "lucide-react";
import { marketplaceCategories } from "@/components/marketplace/CategorySidebar";


interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  onProductAdded: () => void;
  editProduct?: any;
}

const promoTypes = [
  { value: "none", label: "Aucune promotion" },
  { value: "promo", label: "PROMO", icon: Tag },
  { value: "flash", label: "FLASH", icon: Zap },
  { value: "soldes", label: "SOLDES", icon: Tag },
  { value: "nouveau", label: "NOUVEAU", icon: Zap },
];

const AddProductModal = ({ open, onOpenChange, profileId, onProductAdded, editProduct }: AddProductModalProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { uploadImages, uploading } = useImageUpload();
  const { subscription, canPublishProduct, hasActiveSubscription } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const defaultProduct = {
    name: "",
    description: "",
    price: "",
    originalPrice: "",
    discount: "",
    promoType: "none",
    category: "",
    unit: "kg",
    quantity_available: "",
    location: "",
    is_organic: false,
    min_order: "1",
  };

  const [newProduct, setNewProduct] = useState(defaultProduct);

  // Populate form when editing
  useEffect(() => {
    if (editProduct) {
      setNewProduct({
        name: editProduct.name || "",
        description: editProduct.description || "",
        price: String(editProduct.price || ""),
        originalPrice: "",
        discount: "",
        promoType: "none",
        category: editProduct.category || "",
        unit: editProduct.unit || "kg",
        quantity_available: String(editProduct.quantity_available || ""),
        location: editProduct.location || "",
        is_organic: editProduct.is_organic || false,
        min_order: String(editProduct.min_order || "1"),
      });
      if (editProduct.images?.length) {
        setImagePreviews(editProduct.images);
        setImageFiles([]);
      }
    } else {
      setNewProduct(defaultProduct);
      setImagePreviews([]);
      setImageFiles([]);
    }
  }, [editProduct]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (imageFiles.length >= 5) {
        toast({ title: "Limite atteinte", description: "Maximum 5 images par produit", variant: "destructive" });
        return;
      }
      setImageFiles((prev) => [...prev, file]);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check subscription before publishing
    if (!editProduct) {
      const check = await canPublishProduct();
      if (!check.allowed) {
        if (check.reason === "no_subscription") {
          toast({ title: "Abonnement requis", description: "Vous devez souscrire à un plan d'adhésion pour publier des produits.", variant: "destructive" });
          onOpenChange(false);
          navigate("/plans");
          return;
        }
        if (check.reason === "limit_reached") {
          toast({ title: "Limite atteinte", description: `Votre plan ${subscription?.plan} est limité à ${subscription?.max_products} produits. Passez au plan supérieur.`, variant: "destructive" });
          onOpenChange(false);
          navigate("/plans");
          return;
        }
      }
    }

    setIsLoading(true);

    try {
      let imageUrls: string[] = editProduct?.images || [];
      if (imageFiles.length > 0) {
        const uploaded = await uploadImages(imageFiles);
        imageUrls = [...imageUrls, ...uploaded];
      }

      const productData = {
        name: newProduct.name,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        category: newProduct.category,
        unit: newProduct.unit,
        quantity_available: parseFloat(newProduct.quantity_available),
        location: newProduct.location,
        is_organic: newProduct.is_organic,
        min_order: parseFloat(newProduct.min_order) || 1,
        producer_id: profileId,
        images: imageUrls.length > 0 ? imageUrls : null,
      };

      if (editProduct) {
        const { error } = await supabase.from("products").update(productData).eq("id", editProduct.id);
        if (error) throw error;
        toast({ title: "Produit modifié !", description: "Les modifications ont été enregistrées." });
      } else {
        const { error } = await supabase.from("products").insert(productData);
        if (error) throw error;
        toast({ title: "Produit publié !", description: "Votre produit est maintenant visible sur le marketplace." });
      }

      setNewProduct(defaultProduct);
      setImageFiles([]);
      setImagePreviews([]);
      
      onProductAdded();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const productCategories = marketplaceCategories
    .filter(c => c.id !== 'all')
    .map(c => c.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editProduct ? <Edit className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
            {editProduct ? "Modifier le produit" : "Publier un nouveau produit"}
          </DialogTitle>
          <DialogDescription>
            {editProduct ? "Modifiez les informations de votre produit" : "Remplissez les informations pour ajouter votre produit au marketplace"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload - Enhanced Preview */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              Images du produit
              <span className="text-[10px] text-muted-foreground">({imagePreviews.length}/5)</span>
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            
            {/* Large main preview + thumbnails */}
            {imagePreviews.length > 0 && (
              <div className="space-y-2">
                {/* Main large preview */}
                <div className="relative aspect-video rounded-xl overflow-hidden bg-muted border border-border">
                  <img 
                    src={imagePreviews[0]} 
                    alt="Aperçu principal" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-primary text-primary-foreground text-[10px]">Image principale</Badge>
                  </div>
                  <button type="button" onClick={() => removeImage(0)}
                    className="absolute top-2 right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {/* Thumbnail row */}
                {imagePreviews.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {imagePreviews.slice(1).map((img, idx) => (
                      <div key={idx + 1} className="relative flex-shrink-0 group">
                        <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg border border-border" />
                        <button type="button" onClick={() => removeImage(idx + 1)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {imagePreviews.length < 5 && (
              <div onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Cliquez pour ajouter des images</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG jusqu'à 5MB ({5 - imagePreviews.length} restantes)</p>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom du produit *</Label>
              <Input
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="Ex: Maïs jaune premium"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Catégorie *</Label>
              <Select
                value={newProduct.category}
                onValueChange={(v) => setNewProduct({ ...newProduct, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {productCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prix (FCFA) *</Label>
              <Input
                type="number"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                placeholder="Ex: 5000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Prix original (si promo)</Label>
              <Input
                type="number"
                value={newProduct.originalPrice}
                onChange={(e) => setNewProduct({ ...newProduct, originalPrice: e.target.value })}
                placeholder="Ex: 6000"
              />
            </div>

            <div className="space-y-2">
              <Label>Type de promotion</Label>
              <Select
                value={newProduct.promoType}
                onValueChange={(v) => setNewProduct({ ...newProduct, promoType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  {promoTypes.map((promo) => (
                    <SelectItem key={promo.value} value={promo.value}>
                      {promo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Réduction (%)</Label>
              <Input
                type="number"
                value={newProduct.discount}
                onChange={(e) => setNewProduct({ ...newProduct, discount: e.target.value })}
                placeholder="Ex: 20"
                min={0}
                max={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Quantité disponible *</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={newProduct.quantity_available}
                  onChange={(e) => setNewProduct({ ...newProduct, quantity_available: e.target.value })}
                  placeholder="Ex: 100"
                  className="flex-1"
                  required
                />
                <Select
                  value={newProduct.unit}
                  onValueChange={(v) => setNewProduct({ ...newProduct, unit: v })}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="tonne">tonne</SelectItem>
                    <SelectItem value="unité">unité</SelectItem>
                    <SelectItem value="sac">sac</SelectItem>
                    <SelectItem value="carton">carton</SelectItem>
                    <SelectItem value="litre">litre</SelectItem>
                    <SelectItem value="panier">panier</SelectItem>
                    <SelectItem value="lot">lot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Commande minimum</Label>
              <Input
                type="number"
                value={newProduct.min_order}
                onChange={(e) => setNewProduct({ ...newProduct, min_order: e.target.value })}
                placeholder="Ex: 10"
              />
            </div>

            <div className="space-y-2">
              <Label>Localisation *</Label>
              <Input
                value={newProduct.location}
                onChange={(e) => setNewProduct({ ...newProduct, location: e.target.value })}
                placeholder="Ex: Lomé, Togo"
              />
            </div>

            <div className="space-y-2">
              <Label>Délai de livraison estimé</Label>
              <Select
                value={newProduct.deliveryDelay}
                onValueChange={(v) => setNewProduct({ ...newProduct, deliveryDelay: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Disponible immédiatement</SelectItem>
                  <SelectItem value="24h">Sous 24 heures</SelectItem>
                  <SelectItem value="48h">Sous 48 heures</SelectItem>
                  <SelectItem value="3-5j">3-5 jours</SelectItem>
                  <SelectItem value="1sem">1 semaine</SelectItem>
                  <SelectItem value="custom">Sur commande</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mode de vente</Label>
              <Select
                value={newProduct.saleMode}
                onValueChange={(v) => setNewProduct({ ...newProduct, saleMode: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Vente au détail</SelectItem>
                  <SelectItem value="wholesale">Vente en gros</SelectItem>
                  <SelectItem value="both">Détail & Gros</SelectItem>
                  <SelectItem value="auction">Enchères</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              placeholder="Décrivez votre produit, sa qualité, son mode de culture, les conditions de stockage..."
              rows={4}
            />
          </div>

          {/* Toggles section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 sm:p-4 bg-muted rounded-xl">
              <div>
                <Label className="text-sm sm:text-base">Produit biologique</Label>
                <p className="text-xs text-muted-foreground">
                  Cultivé sans pesticides chimiques
                </p>
              </div>
              <Switch
                checked={newProduct.is_organic}
                onCheckedChange={(v) => setNewProduct({ ...newProduct, is_organic: v })}
              />
            </div>
            <div className="flex items-center justify-between p-3 sm:p-4 bg-muted rounded-xl">
              <div>
                <Label className="text-sm sm:text-base">Négociable</Label>
                <p className="text-xs text-muted-foreground">
                  Le prix est ouvert à la négociation
                </p>
              </div>
              <Switch
                checked={newProduct.negotiable}
                onCheckedChange={(v) => setNewProduct({ ...newProduct, negotiable: v })}
              />
            </div>
            <div className="flex items-center justify-between p-3 sm:p-4 bg-muted rounded-xl">
              <div>
                <Label className="text-sm sm:text-base">Livraison disponible</Label>
                <p className="text-xs text-muted-foreground">
                  Vous proposez la livraison
                </p>
              </div>
              <Switch
                checked={newProduct.deliveryAvailable}
                onCheckedChange={(v) => setNewProduct({ ...newProduct, deliveryAvailable: v })}
              />
            </div>
          </div>

          {/* Live Product Preview */}
          {newProduct.name && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Aperçu de votre annonce
              </Label>
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <div className="flex gap-3 p-3">
                  {imagePreviews.length > 0 ? (
                    <img src={imagePreviews[0]} alt="" className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Package className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {newProduct.is_organic && (
                        <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5">BIO</Badge>
                      )}
                      {newProduct.category && (
                        <Badge variant="secondary" className="text-[9px]">{newProduct.category}</Badge>
                      )}
                    </div>
                    <h4 className="font-semibold text-sm text-foreground line-clamp-1">{newProduct.name}</h4>
                    {newProduct.location && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5" />{newProduct.location}
                      </p>
                    )}
                    <div className="flex items-baseline gap-1.5 mt-1.5">
                      <span className="font-heading text-base font-bold text-primary">
                        {newProduct.price ? Number(newProduct.price).toLocaleString() : "0"} FCFA
                      </span>
                      <span className="text-[10px] text-muted-foreground">/{newProduct.unit}</span>
                    </div>
                    {newProduct.quantity_available && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {newProduct.quantity_available} {newProduct.unit}(s) disponibles
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subscription info */}
          {subscription && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
              <Crown className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                Plan <span className="font-semibold text-foreground">{subscription.plan === "free" ? "Gratuit" : subscription.plan === "pro" ? "Pro" : "Business"}</span>
                {" "}— {subscription.max_products >= 9999 ? "produits illimités" : `${subscription.max_products} produits max`}
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="hero" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publication...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {editProduct ? "Enregistrer" : "Publier le produit"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductModal;
