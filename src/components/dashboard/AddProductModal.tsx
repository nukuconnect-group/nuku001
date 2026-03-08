import { useState, useRef } from "react";
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
import { Plus, Loader2, Upload, X, Tag, Zap, Edit } from "lucide-react";
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
  const { uploadImages, uploading } = useImageUpload();
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
  useState(() => {
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
      }
    }
  });

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
          {/* Image Upload */}
          <div className="space-y-3">
            <Label>Images du produit</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            
            {imagePreviews.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {imagePreviews.map((img, idx) => (
                  <div key={idx} className="relative flex-shrink-0">
                    <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg" />
                    <button type="button" onClick={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {imagePreviews.length < 5 && (
              <div onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
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

            <div className="space-y-2 md:col-span-2">
              <Label>Localisation</Label>
              <Input
                value={newProduct.location}
                onChange={(e) => setNewProduct({ ...newProduct, location: e.target.value })}
                placeholder="Ex: Lomé, Togo"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              placeholder="Décrivez votre produit, sa qualité, son mode de culture..."
              rows={4}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
            <div>
              <Label className="text-base">Produit biologique</Label>
              <p className="text-sm text-muted-foreground">
                Cochez si votre produit est cultivé sans pesticides chimiques
              </p>
            </div>
            <Switch
              checked={newProduct.is_organic}
              onCheckedChange={(v) => setNewProduct({ ...newProduct, is_organic: v })}
            />
          </div>

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
                  Publier le produit
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
