import { useState } from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutGrid, ChevronDown, Loader2 } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";

interface CategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CategorySheet = ({ open, onOpenChange }: CategorySheetProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: categories = [], isLoading } = useCategories();

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
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              <Link
                to="/marketplace"
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium text-foreground">Toutes catégories</span>
              </Link>

              {categories.map((category) => {
                const hasSubs = category.subcategories && category.subcategories.length > 0;
                const isExpanded = expandedId === category.id;

                return (
                  <div key={category.id}>
                    <div className="flex items-center">
                      <Link
                        to={`/marketplace?category=${category.name.toLowerCase()}`}
                        onClick={() => onOpenChange(false)}
                        className="flex-1 px-3 py-3 rounded-lg hover:bg-muted transition-colors active:scale-[0.98]"
                      >
                        <span className="text-sm font-medium text-foreground">{category.name}</span>
                      </Link>
                      {hasSubs && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : category.id)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
                        >
                          <ChevronDown
                            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {hasSubs && isExpanded && (
                      <div className="ml-4 pl-3 border-l-2 border-primary/20 space-y-0.5 pb-1">
                        {category.subcategories!.map((sub) => (
                          <Link
                            key={sub}
                            to={`/marketplace?category=${sub.toLowerCase()}`}
                            onClick={() => onOpenChange(false)}
                            className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                          >
                            {sub}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default CategorySheet;
