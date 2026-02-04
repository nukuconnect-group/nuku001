import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid } from "lucide-react";
import { marketplaceCategories } from "@/components/marketplace/CategorySidebar";

interface CategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CategorySheet = ({ open, onOpenChange }: CategorySheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-4 border-b border-border bg-primary text-primary-foreground">
          <SheetTitle className="flex items-center gap-2 text-primary-foreground">
            <LayoutGrid className="w-5 h-5" />
            Catégories
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-2">
            {marketplaceCategories.map((category) => (
              <Link
                key={category.id}
                to={`/marketplace?category=${category.id}`}
                onClick={() => onOpenChange(false)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted text-foreground transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <category.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <span className="font-medium">{category.name}</span>
                  <p className="text-xs text-muted-foreground">
                    {category.count} produits
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {category.count}
                </Badge>
              </Link>
            ))}
          </div>
          
          {/* Featured Categories */}
          <div className="p-4 border-t border-border">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">
              POPULAIRES
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {marketplaceCategories.slice(1, 5).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/marketplace?category=${cat.id}`}
                  onClick={() => onOpenChange(false)}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <cat.icon className="w-6 h-6 text-primary" />
                  <span className="text-xs font-medium text-center">{cat.name}</span>
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
