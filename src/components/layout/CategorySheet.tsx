import { useState } from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutGrid, ChevronDown } from "lucide-react";
import { marketplaceCategories } from "@/components/marketplace/CategorySidebar";

interface CategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CategorySheet = ({ open, onOpenChange }: CategorySheetProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

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
          <div className="p-2 space-y-0.5">
            {marketplaceCategories.map((category) => {
              const hasSubs = category.subcategories && category.subcategories.length > 0;
              const isExpanded = expandedId === category.id;

              return (
                <div key={category.id}>
                  <div className="flex items-center">
                    <Link
                      to={`/marketplace?category=${category.id}`}
                      onClick={() => onOpenChange(false)}
                      className="flex-1 flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors active:scale-[0.98]"
                    >
                      <span className="text-sm font-medium text-foreground">{category.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto mr-1 bg-muted px-2 py-0.5 rounded-full">
                        {category.count}
                      </span>
                    </Link>
                    {hasSubs && (
                      <button
                        onClick={() => toggleExpand(category.id)}
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
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default CategorySheet;
