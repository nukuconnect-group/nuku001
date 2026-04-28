import { useState, useRef, useEffect, useMemo } from "react";
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
import { Plus, Loader2, Upload, X, Tag, Zap, Edit, Crown, Eye, Package, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCategories } from "@/hooks/useCategories";
import { useProfile } from "@/contexts/ProfileContext";
import PriceTiersEditor, { type TierDraft, validateTiers } from "@/components/dashboard/PriceTiersEditor";

const LocationSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [addresses, setAddresses] = useState<{ id: string; label: string; city: string | null; quarter: string | null; country: string | null }[]>([]);
  const [manualMode, setManualMode] = useState(false);
  const { profile } = useProfile();

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("delivery_addresses")
        .select("id, label, city, quarter, country")
        .eq("user_id", session.user.id);
      setAddresses(data || []);
      if (!value && profile?.location) {
        onChange(profile.location);
      } else if (!value && data?.length) {
        const addr = data[0];
        onChange([addr.quarter, addr.city, addr.country].filter(Boolean).join(", "));
      }
    };
    load();
  }, []);

  const options = [
    ...(profile?.location ? [{ key: "profile", label: `📍 ${profile.location}`, val: profile.location }] : []),
    ...addresses.map(a => ({
      key: a.id,
      label: `${a.label} — ${[a.quarter, a.city, a.country].filter(Boolean).join(", ")}`,
      val: [a.quarter, a.city, a.country].filter(Boolean).join(", "),
    })),
  ];

  if (options.length === 0 || manualMode) {
    return (
      <div className="space-y-1.5">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Ex: Lomé, Togo" />
        {options.length > 0 && (
          <button type="button" onClick={() => setManualMode(false)} className="text-[10px] text-primary hover:underline">
            ← Choisir parmi mes adresses
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Select value={value} onValueChange={(v) => { if (v === "__custom") { setManualMode(true); onChange(""); } else { onChange(v); } }}>
        <SelectTrigger>
          <SelectValue placeholder="Choisir une localisation" />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.key} value={o.val}>{o.label}</SelectItem>
          ))}
          <SelectItem value="__custom">✏️ Saisir manuellement</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};


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
    shipping_delay_days: "1",
    deliveryDelay: "immediate",
    saleMode: "retail",
    negotiable: false,
    deliveryAvailable: true,
    stockStatus: "in_stock",
  };

  const [newProduct, setNewProduct] = useState(defaultProduct);
  const [priceTiers, setPriceTiers] = useState<TierDraft[]>([]);

  // Load existing price tiers in edit mode
  useEffect(() => {
    if (!editProduct?.id) { setPriceTiers([]); return; }
    (async () => {
      const { data } = await supabase
        .from("product_price_tiers" as any)
        .select("min_quantity,max_quantity,price")
        .eq("product_id", editProduct.id)
        .order("sort_order", { ascending: true });
      setPriceTiers(((data as any[]) || []).map(t => ({
        min_quantity: String(t.min_quantity ?? ""),
        max_quantity: t.max_quantity != null ? String(t.max_quantity) : "",
        price: String(t.price ?? ""),
      })));
    })();
  }, [editProduct?.id]);

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
        shipping_delay_days: String((editProduct as any).shipping_delay_days ?? "1"),
        deliveryDelay: "immediate",
        saleMode: "retail",
        negotiable: editProduct.is_negotiable || false,
        deliveryAvailable: true,
        stockStatus: editProduct.stock_status || "in_stock",
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

    // Validate price tiers — au moins un palier de gros est obligatoire
    const tierErrors = validateTiers(priceTiers, { required: true });
    if (tierErrors.length > 0) {
      toast({
        title: "Prix de gros requis",
        description: tierErrors[0],
        variant: "destructive",
      });
      return;
    }

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
      // imagePreviews est la source de vérité (gère ajouts ET suppressions en mode édition)
      const existingUrls = imagePreviews.filter(p => /^https?:\/\//.test(p));
      let uploadedUrls: string[] = [];
      if (imageFiles.length > 0) {
        uploadedUrls = await uploadImages(imageFiles);
      }
      const imageUrls = [...existingUrls, ...uploadedUrls];

      const productData: any = {
        name: newProduct.name,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        category: newProduct.category,
        unit: newProduct.unit,
        quantity_available: parseFloat(newProduct.quantity_available) || 0,
        location: newProduct.location,
        is_organic: newProduct.is_organic,
        is_negotiable: newProduct.negotiable,
        stock_status: newProduct.stockStatus || (parseFloat(newProduct.quantity_available) > 0 ? 'in_stock' : 'out_of_stock'),
        min_order: parseFloat(newProduct.min_order) || 1,
        shipping_delay_days: Math.max(0, Math.min(30, parseInt(newProduct.shipping_delay_days || "1", 10) || 1)),
        producer_id: profileId,
        images: imageUrls.length > 0 ? imageUrls : null,
      };

      let savedProductId: string | null = null;
      if (editProduct) {
        const { error } = await supabase.from("products").update(productData).eq("id", editProduct.id);
        if (error) throw error;
        savedProductId = editProduct.id;
        toast({ title: "Produit modifié !", description: "Les modifications ont été enregistrées." });
      } else {
        const { data, error } = await supabase.from("products").insert(productData).select("id").single();
        if (error) throw error;
        savedProductId = (data as any)?.id || null;
        toast({
          title: "📤 Produit soumis pour analyse",
          description: "Notre IA vérifie la conformité de votre produit. Il sera publié sur la marketplace d'ici environ 20 minutes s'il respecte les normes.",
        });
      }

      // Sync price tiers (replace strategy)
      if (savedProductId) {
        await supabase.from("product_price_tiers" as any).delete().eq("product_id", savedProductId);
        const validTiers = priceTiers
          .filter(t => t.min_quantity && t.price)
          .map((t, idx) => ({
            product_id: savedProductId,
            min_quantity: parseFloat(t.min_quantity),
            max_quantity: t.max_quantity ? parseFloat(t.max_quantity) : null,
            price: parseFloat(t.price),
            sort_order: idx,
          }));
        if (validTiers.length > 0) {
          await supabase.from("product_price_tiers" as any).insert(validTiers as any);
        }
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

  // Fetch categories from DB
  const { data: dbCategoriesList = [] } = useCategories();
  const [customCategory, setCustomCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

  const productCategories = useMemo(() => {
    return dbCategoriesList.map(c => c.name);
  }, [dbCategoriesList]);

  const handleCreateCategory = async () => {
    if (!customCategory.trim()) return;
    const { error } = await supabase.from("categories").insert({
      name: customCategory.trim(),
      sort_order: dbCategoriesList.length + 1,
    } as any);
    if (!error) {
      setNewProduct({ ...newProduct, category: customCategory.trim() });
      setCustomCategory("");
      setShowNewCategory(false);
      toast({ title: "Catégorie créée !" });
    }
  };

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
              {showNewCategory ? (
                <div className="flex gap-2">
                  <Input
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Nom de la nouvelle catégorie"
                    className="flex-1"
                  />
                  <Button type="button" size="sm" onClick={handleCreateCategory} disabled={!customCategory.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewCategory(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select
                    value={newProduct.category}
                    onValueChange={(v) => setNewProduct({ ...newProduct, category: v })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {productCategories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowNewCategory(true)} title="Créer une catégorie">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
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
                onChange={(e) => {
                  const originalPrice = e.target.value;
                  const price = parseFloat(newProduct.price);
                  const orig = parseFloat(originalPrice);
                  let discount = newProduct.discount;
                  if (orig > 0 && price > 0 && orig > price) {
                    discount = String(Math.round(((orig - price) / orig) * 100));
                  }
                  setNewProduct({ ...newProduct, originalPrice, discount });
                }}
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
              <div className="relative">
                <Input
                  type="number"
                  value={newProduct.discount}
                  onChange={(e) => setNewProduct({ ...newProduct, discount: e.target.value })}
                  placeholder="Auto-calculé"
                  min={0}
                  max={100}
                  readOnly={!!(newProduct.originalPrice && newProduct.price)}
                  className={newProduct.discount ? "pr-8" : ""}
                />
                {newProduct.discount && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary">
                    -{newProduct.discount}%
                  </span>
                )}
              </div>
              {newProduct.originalPrice && newProduct.price && parseFloat(newProduct.originalPrice) > parseFloat(newProduct.price) && (
                <p className="text-[10px] text-muted-foreground">
                  Réduction calculée automatiquement : {newProduct.discount}%
                </p>
              )}
            </div>

            {/* Stock Status - BEFORE quantity */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-primary" />
                Statut du stock *
              </Label>
              <Select
                value={newProduct.stockStatus}
                onValueChange={(v) => {
                  const updates: any = { stockStatus: v };
                  if (v === "restocking" || v === "out_of_stock") {
                    updates.quantity_available = "0";
                  }
                  setNewProduct({ ...newProduct, ...updates });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="En stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">✅ En stock</SelectItem>
                  <SelectItem value="low_stock">⚠️ Stock faible</SelectItem>
                  <SelectItem value="restocking">🔄 En réapprovisionnement</SelectItem>
                  <SelectItem value="out_of_stock">❌ Rupture de stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Quantité disponible {newProduct.stockStatus !== "restocking" && newProduct.stockStatus !== "out_of_stock" ? "*" : "(optionnel)"}
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={newProduct.quantity_available}
                  onChange={(e) => setNewProduct({ ...newProduct, quantity_available: e.target.value })}
                  placeholder={newProduct.stockStatus === "restocking" || newProduct.stockStatus === "out_of_stock" ? "0" : "Ex: 100"}
                  className="flex-1"
                  required={newProduct.stockStatus !== "restocking" && newProduct.stockStatus !== "out_of_stock"}
                  disabled={newProduct.stockStatus === "out_of_stock"}
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
              {(newProduct.stockStatus === "restocking" || newProduct.stockStatus === "out_of_stock") && (
                <p className="text-[10px] text-muted-foreground">
                  La quantité n'est pas obligatoire pour les produits en réapprovisionnement ou en rupture.
                </p>
              )}
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
              <Label>Délai d'expédition (jours)</Label>
              <Input
                type="number"
                min="0"
                max="30"
                value={newProduct.shipping_delay_days}
                onChange={(e) => setNewProduct({ ...newProduct, shipping_delay_days: e.target.value })}
                placeholder="0 = immédiate, 1 = 24h"
              />
              <p className="text-[10px] text-muted-foreground">
                0 = expédition immédiate · 1 = sous 24h · 2-15 = sous N jours
              </p>
            </div>
          </div>

          {/* Price tiers (style Alibaba) */}
          <PriceTiersEditor
            value={priceTiers}
            onChange={setPriceTiers}
            unit={newProduct.unit}
            basePrice={newProduct.price}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2 hidden">
              <Label>placeholder</Label>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Localisation *
              </Label>
              <LocationSelect
                value={newProduct.location}
                onChange={(v) => setNewProduct({ ...newProduct, location: v })}
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
            {/* Stock status is now in the grid above */}
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
                        {newProduct.price ? Number(newProduct.price).toLocaleString("en-US") : "0"} FCFA
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
