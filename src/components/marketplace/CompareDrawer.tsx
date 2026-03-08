import { X, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Product } from "@/data/marketplace";
import { useLanguage } from "@/contexts/LanguageContext";
import { Star, Leaf, MapPin, ShieldCheck } from "lucide-react";

interface CompareDrawerProps {
  products: Product[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

const CompareDrawer = ({ products, open, onOpenChange, onRemove, onClear }: CompareDrawerProps) => {
  const { formatPrice } = useLanguage();

  if (products.length === 0) return null;

  return (
    <>
      {/* Floating compare bar */}
      {!open && products.length > 0 && (
        <div className="fixed bottom-16 lg:bottom-4 left-1/2 -translate-x-1/2 z-40 bg-card border border-border shadow-elevated rounded-full px-4 py-2 flex items-center gap-3 animate-fade-in">
          <GitCompareArrows className="w-4 h-4 text-primary" />
          <div className="flex -space-x-2">
            {products.map((p) => (
              <img key={p.id} src={p.image} alt="" className="w-8 h-8 rounded-full border-2 border-card object-cover" />
            ))}
          </div>
          <Badge variant="default" className="text-[10px] h-5">{products.length}</Badge>
          <Button size="sm" variant="hero" className="text-xs h-7 gap-1" onClick={() => onOpenChange(true)} disabled={products.length < 2}>
            Comparer
          </Button>
          <button onClick={onClear} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Compare sheet */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] sm:h-[80vh] rounded-t-2xl">
          <SheetHeader className="pb-3">
            <SheetTitle className="flex items-center gap-2 text-sm sm:text-base">
              <GitCompareArrows className="w-5 h-5 text-primary" />
              Comparaison ({products.length} produits)
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-x-auto pb-4">
            <table className="w-full min-w-[500px] text-xs sm:text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 text-muted-foreground font-medium w-24"></th>
                  {products.map((p) => (
                    <th key={p.id} className="p-2 text-center min-w-[140px]">
                      <div className="relative">
                        <button onClick={() => onRemove(p.id)} className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                          <X className="w-3 h-3" />
                        </button>
                        <img src={p.image} alt={p.name} className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover mx-auto mb-2" />
                        <p className="font-semibold text-foreground line-clamp-2 text-xs">{p.name}</p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="p-2 text-muted-foreground font-medium">Prix</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-2 text-center font-bold text-primary">{formatPrice(p.price)}/{p.unit}</td>
                  ))}
                </tr>
                <tr className="border-t border-border bg-muted/30">
                  <td className="p-2 text-muted-foreground font-medium">Catégorie</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-2 text-center capitalize">{p.category}</td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="p-2 text-muted-foreground font-medium flex items-center gap-1"><MapPin className="w-3 h-3" />Lieu</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-2 text-center">{p.location}</td>
                  ))}
                </tr>
                <tr className="border-t border-border bg-muted/30">
                  <td className="p-2 text-muted-foreground font-medium flex items-center gap-1"><Leaf className="w-3 h-3" />Bio</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-2 text-center">
                      {p.isOrganic ? <Badge className="bg-primary text-primary-foreground text-[9px]">BIO</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="p-2 text-muted-foreground font-medium flex items-center gap-1"><Star className="w-3 h-3" />Note</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-3 h-3 text-accent fill-accent" />
                        <span>{p.producer.rating}</span>
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border bg-muted/30">
                  <td className="p-2 text-muted-foreground font-medium flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Fournisseur</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs">{p.producer.name}</span>
                        {p.producer.verified && <ShieldCheck className="w-3 h-3 text-primary" />}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="p-2 text-muted-foreground font-medium">Stock</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-2 text-center">{p.quantity} {p.unit}s</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex justify-center pt-2">
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={onClear}>
              <X className="w-3 h-3" />Vider la comparaison
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CompareDrawer;
