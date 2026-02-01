import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2, Image, Upload } from "lucide-react";
import { marketplaceCategories } from "@/components/marketplace/CategorySidebar";

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  onProductAdded: () => void;
}

const AddProductModal = ({ open, onOpenChange, profileId, onProductAdded }: AddProductModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    unit: "kg",
    quantity_available: "",
    location: "",
    is_organic: false,
    min_order: "1",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.from("products").insert({
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
      });

      if (error) throw error;

      toast({
        title: "Produit publié !",
        description: "Votre produit est maintenant visible sur le marketplace.",
      });

      setNewProduct({
        name: "",
        description: "",
        price: "",
        category: "",
        unit: "kg",
        quantity_available: "",
        location: "",
        is_organic: false,
        min_order: "1",
      });
      
      onProductAdded();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
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
            <Plus className="w-5 h-5 text-primary" />
            Publier un nouveau produit
          </DialogTitle>
          <DialogDescription>
            Remplissez les informations pour ajouter votre produit au marketplace
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload Placeholder */}
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
            <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Glissez vos images ici ou cliquez pour télécharger
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG jusqu'à 5MB (max 5 images)
            </p>
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

            <div className="space-y-2">
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
