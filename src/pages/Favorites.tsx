import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import ProductCard from "@/components/marketplace/ProductCard";
import { useWishlist } from "@/hooks/useWishlist";
import { useProducts } from "@/hooks/useProducts";
import { products as mockProducts } from "@/data/marketplace";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Favorites = () => {
  const { wishlist, isLoading: wishlistLoading, isAuthenticated } = useWishlist();
  const { data: dbProducts, isLoading: productsLoading } = useProducts();

  const allProducts = dbProducts || [];

  const favoriteProducts = allProducts.filter((p) =>
    wishlist.some((w) => w.product_id === p.id)
  );

  const isLoading = wishlistLoading || productsLoading;

  return (
    <div className="min-h-screen bg-background pb-14 lg:pb-0">
      <Header />
      <main>
        <div className="container mx-auto px-3 sm:px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                  Mes Favoris
                </h1>
                <p className="text-xs text-muted-foreground">
                  {favoriteProducts.length} produit(s) sauvegardé(s)
                </p>
              </div>
            </div>

            {!isAuthenticated ? (
              <div className="text-center py-16">
                <Heart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Connectez-vous pour voir vos favoris
                </p>
                <Link to="/auth">
                  <Button variant="hero">Se connecter</Button>
                </Link>
              </div>
            ) : isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : favoriteProducts.length === 0 ? (
              <div className="text-center py-16">
                <Heart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Aucun produit dans vos favoris
                </p>
                <Link to="/marketplace">
                  <Button variant="hero">Explorer le marché</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {favoriteProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    viewMode="grid"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Favorites;
