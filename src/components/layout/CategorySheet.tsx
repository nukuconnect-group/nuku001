import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutGrid } from "lucide-react";
import { marketplaceCategories } from "@/components/marketplace/CategorySidebar";

interface CategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CategorySheet = ({ open, onOpenChange }: CategorySheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
        <SheetHeader className="p-4 border-b border-border bg-primary text-primary-foreground">
          <SheetTitle className="flex items-center gap-2 text-primary-foreground">
            <LayoutGrid className="w-5 h-5" />
            Catégories
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)]">
          {/* Grid of categories */}
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2">
              {marketplaceCategories.map((category) => (
                <Link
                  key={category.id}
                  to={`/marketplace?category=${category.id}`}
                  onClick={() => onOpenChange(false)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-muted border border-border/50 hover:border-primary/30 transition-all active:scale-95"
                >
                  <span className="text-2xl">{category.emoji}</span>
                  <span className="text-[11px] font-medium text-foreground text-center leading-tight line-clamp-2">
                    {category.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{category.count}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Popular section */}
          <div className="p-3 pt-1 border-t border-border">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider px-1">
              Populaires
            </h4>
            <div className="space-y-0.5">
              {marketplaceCategories.slice(1, 6).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/marketplace?category=${cat.id}`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="flex-1 text-sm font-medium text-foreground">{cat.name}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {cat.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default CategorySheet;
