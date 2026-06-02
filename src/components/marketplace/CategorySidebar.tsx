import { useState } from "react";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronRight, LayoutGrid, Loader2 } from "lucide-react";
import { useCategories, DbCategory } from "@/hooks/useCategories";

interface CategorySidebarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const CategorySidebar = ({ selectedCategory, onCategoryChange }: CategorySidebarProps) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const { data: categories = [], isLoading } = useCategories();

  return (
    <div className="hidden lg:block w-64 bg-card border-r border-border h-[calc(100vh-80px)] sticky top-20">
      <div className="p-4 border-b border-border">
        <h2 className="font-heading font-semibold text-foreground">Catégories</h2>
      </div>
      <ScrollArea className="h-[calc(100%-60px)]">
        <div className="p-2 space-y-0.5">
          {/* All categories button */}
          <button
            onClick={() => onCategoryChange("all")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-foreground"
            }`}
          >
            <span className="text-lg flex-shrink-0">🏪</span>
            <span className="flex-1 text-left text-sm font-medium truncate">Toutes catégories</span>
          </button>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            categories.map((category) => (
              <div key={category.id}>
                <button
                  onClick={() => {
                    onCategoryChange(category.name.toLowerCase());
                    setExpandedCategory(expandedCategory === category.id ? null : category.id);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    selectedCategory === category.name.toLowerCase()
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  {category.image_url ? (
                    <img src={category.image_url} alt={category.name} className="w-7 h-7 rounded object-cover flex-shrink-0 border border-border/40" loading="lazy" />
                  ) : (
                    <span className="text-lg flex-shrink-0">{category.emoji || "📦"}</span>
                  )}
                  <span className="flex-1 text-left text-sm font-medium truncate">{category.name}</span>
                  {category.subcategories && category.subcategories.length > 0 && (
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        expandedCategory === category.id ? "rotate-90" : ""
                      }`}
                    />
                  )}
                </button>

                {expandedCategory === category.id && category.subcategories && category.subcategories.length > 0 && (
                  <div className="ml-9 mt-1 space-y-0.5">
                    {category.subcategories.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => onCategoryChange(sub.toLowerCase())}
                        className="w-full text-left px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

interface MobileCategorySidebarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MobileCategorySidebar = ({
  selectedCategory,
  onCategoryChange,
  open,
  onOpenChange,
}: MobileCategorySidebarProps) => {
  const { data: categories = [] } = useCategories();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5" />
            Catégories
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-2 space-y-0.5">
            <button
              onClick={() => { onCategoryChange("all"); onOpenChange(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground"
              }`}
            >
              <span className="flex-1 text-left font-medium">Toutes catégories</span>
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => { onCategoryChange(category.name.toLowerCase()); onOpenChange(false); }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                  selectedCategory === category.name.toLowerCase()
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <span className="flex-1 text-left font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
