import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Package, Search, Loader2, ShieldCheck, MapPin, Leaf, Eye, Star, LayoutGrid, Trash2, Edit, AlertCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import AddProductModal from "@/components/dashboard/AddProductModal";

const ProductsManager = () => {
  const { formatPrice } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showOnlyOrganic, setShowOnlyOrganic] = useState(false);
  const [showRejectedOnly, setShowRejectedOnly] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*, profiles:producer_id(user_id, full_name, avatar_url, is_verified, location)")
      .order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Supprimer le produit "${productName}" ? Cette action est irréversible.`)) return;
    setDeletingId(productId);
    // Get owner before delete to notify them
    const owner = products.find(p => p.id === productId);
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Produit supprimé", description: `"${productName}" a été retiré de la marketplace.` });
      setProducts(prev => prev.filter(p => p.id !== productId));
      // Invalidate marketplace caches so it disappears from public listings
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      try { localStorage.removeItem("nuku_products_cache"); } catch {}
      // Notify the owner in-app
      const ownerUserId = owner?.profiles?.user_id;
      if (ownerUserId) {
        await supabase.from("notifications").insert({
          user_id: ownerUserId,
          type: "product",
          title: "🗑️ Produit retiré par l'administration",
          description: `Votre produit "${productName}" a été retiré de la marketplace par notre équipe. Contactez le support pour plus d'informations.`,
        });
      }
    }
    setDeletingId(null);
  };

  const categories = [...new Set(products.map(p => p.category))].filter(Boolean);

  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.profiles?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "all" || p.category === filterCategory;
    const matchOrganic = !showOnlyOrganic || p.is_organic;
    const matchRejected = !showRejectedOnly || p.moderation_status === "rejected";
    return matchSearch && matchCategory && matchOrganic && matchRejected;
  });

  const rejectedCount = products.filter(p => p.moderation_status === "rejected").length;

  const totalValue = products.reduce((s, p) => s + (p.price * p.quantity_available), 0);
  const organicCount = products.filter(p => p.is_organic).length;
  const verifiedProducers = [...new Set(products.filter(p => p.profiles?.is_verified).map(p => p.producer_id))].length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <Package className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{products.length}</p>
            <p className="text-[10px] text-muted-foreground">Produits total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Leaf className="w-5 h-5 mx-auto text-green-600 mb-1" />
            <p className="text-lg font-bold">{organicCount}</p>
            <p className="text-[10px] text-muted-foreground">Bio / Traçables</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <ShieldCheck className="w-5 h-5 mx-auto text-blue-600 mb-1" />
            <p className="text-lg font-bold">{verifiedProducers}</p>
            <p className="text-[10px] text-muted-foreground">Producteurs vérifiés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <LayoutGrid className="w-5 h-5 mx-auto text-purple-600 mb-1" />
            <p className="text-lg font-bold">{categories.length}</p>
            <p className="text-[10px] text-muted-foreground">Catégories actives</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1">
              <CardTitle className="text-sm">Catalogue produits</CardTitle>
              <CardDescription className="text-[11px]">{filtered.length} produits • Valeur: {formatPrice(totalValue)}</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
              </div>
              <Button
                variant={showOnlyOrganic ? "default" : "outline"}
                size="sm"
                className="h-8 text-[10px] gap-1"
                onClick={() => setShowOnlyOrganic(!showOnlyOrganic)}
              >
                <Leaf className="w-3 h-3" />Bio
              </Button>
              <Button
                variant={showRejectedOnly ? "destructive" : "outline"}
                size="sm"
                className="h-8 text-[10px] gap-1"
                onClick={() => setShowRejectedOnly(!showRejectedOnly)}
                title="Voir uniquement les produits rejetés par l'IA"
              >
                <XCircle className="w-3 h-3" />Rejetés ({rejectedCount})
              </Button>
            </div>
          </div>
          {/* Rejection reason banner when filter active */}
          {showRejectedOnly && (
            <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-destructive">
                Modifiez un produit rejeté puis enregistrez : il sera automatiquement réapprouvé et publié sur la marketplace, et le vendeur recevra une notification.
              </p>
            </div>
          )}
          {/* Category chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Button variant={filterCategory === "all" ? "default" : "outline"} size="sm" className="h-6 text-[9px] px-2" onClick={() => setFilterCategory("all")}>
              Tout ({products.length})
            </Button>
            {categories.map(cat => (
              <Button key={cat} variant={filterCategory === cat ? "default" : "outline"} size="sm" className="h-6 text-[9px] px-2" onClick={() => setFilterCategory(cat)}>
                {cat} ({products.filter(p => p.category === cat).length})
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-1.5 font-medium text-muted-foreground">Produit</th>
                  <th className="text-left py-2 px-1.5 font-medium text-muted-foreground hidden sm:table-cell">Fournisseur</th>
                  <th className="text-left py-2 px-1.5 font-medium text-muted-foreground hidden md:table-cell">Catégorie</th>
                  <th className="text-right py-2 px-1.5 font-medium text-muted-foreground">Prix</th>
                  <th className="text-right py-2 px-1.5 font-medium text-muted-foreground">Stock</th>
                  <th className="text-center py-2 px-1.5 font-medium text-muted-foreground">Labels</th>
                  <th className="text-center py-2 px-1.5 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-1.5">
                      <div className="flex items-center gap-2">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[150px]">{p.name}</p>
                          <p className="text-[9px] text-muted-foreground">{p.location || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-1.5 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[100px]">{p.profiles?.full_name || "—"}</span>
                        {p.profiles?.is_verified && <ShieldCheck className="w-3 h-3 text-primary flex-shrink-0" />}
                      </div>
                    </td>
                    <td className="py-2 px-1.5 hidden md:table-cell text-muted-foreground">{p.category}</td>
                    <td className="py-2 px-1.5 text-right font-semibold text-primary">{formatPrice(p.price)}/{p.unit}</td>
                    <td className="py-2 px-1.5 text-right">
                      <span className={p.quantity_available <= 0 ? "text-destructive" : ""}>
                        {p.quantity_available} {p.unit}
                      </span>
                    </td>
                    <td className="py-2 px-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {p.is_organic && <Badge variant="outline" className="text-[8px] px-1 text-green-600 border-green-300">Bio</Badge>}
                        {p.profiles?.is_verified && <Badge variant="outline" className="text-[8px] px-1 text-blue-600 border-blue-300">Vérifié</Badge>}
                      </div>
                    </td>
                    <td className="py-2 px-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link to={`/produit/${p.id}`}>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Voir">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                          onClick={() => setEditingProduct(p)}
                          title="Modifier (image, position, infos)"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          disabled={deletingId === p.id}
                          title="Supprimer"
                        >
                          {deletingId === p.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Aucun produit trouvé</p>}
          </div>
        </CardContent>
      </Card>

      {editingProduct && (
        <AddProductModal
          open={!!editingProduct}
          onOpenChange={(o) => { if (!o) setEditingProduct(null); }}
          profileId={editingProduct.producer_id}
          editProduct={editingProduct}
          onProductAdded={async () => {
            // Admin edits force-approve and notify the producer
            const { data: prod } = await supabase
              .from("products")
              .select("id, name, producer_id, profiles:producer_id(user_id)")
              .eq("id", editingProduct.id)
              .single();
            if (prod) {
              await supabase.from("products").update({
                moderation_status: "approved",
                moderation_reason: null,
                moderated_at: new Date().toISOString(),
              }).eq("id", prod.id);
              const ownerUserId = (prod as any).profiles?.user_id;
              if (ownerUserId) {
                await supabase.from("notifications").insert({
                  user_id: ownerUserId,
                  type: "product",
                  title: "✅ Produit modéré par Nukuconnect IA",
                  description: `Votre produit "${prod.name}" a été modifié et republié sur la marketplace par notre équipe.`,
                  product_id: prod.id,
                });
              }
            }
            setEditingProduct(null);
            loadProducts();
          }}
        />
      )}
    </div>
  );
};

export default ProductsManager;
