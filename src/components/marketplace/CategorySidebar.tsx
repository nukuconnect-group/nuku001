import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronRight, LayoutGrid } from "lucide-react";

export interface MarketplaceCategory {
  id: string;
  name: string;
  emoji: string;
  color: string;
  count: number;
  subcategories?: string[];
}

export const marketplaceCategories: MarketplaceCategory[] = [
  { 
    id: "all", 
    name: "Toutes catégories", 
    emoji: "🏪",
    color: "hsl(var(--primary))",
    count: 250,
    subcategories: []
  },
  { 
    id: "agriculture", 
    name: "Agriculture", 
    emoji: "🚜",
    color: "#16a34a",
    count: 85,
    subcategories: ["Céréales", "Légumineuses", "Oléagineux", "Cultures maraîchères"]
  },
  { 
    id: "cereales", 
    name: "Céréales", 
    emoji: "🌾",
    color: "#ca8a04",
    count: 45,
    subcategories: ["Maïs", "Riz", "Sorgho", "Mil", "Blé"]
  },
  { 
    id: "legumes", 
    name: "Légumes & Maraîchage", 
    emoji: "🥬",
    color: "#15803d",
    count: 38,
    subcategories: ["Tomates", "Oignons", "Piments", "Carottes", "Choux"]
  },
  { 
    id: "fruits", 
    name: "Fruits", 
    emoji: "🍊",
    color: "#ea580c",
    count: 28,
    subcategories: ["Mangues", "Ananas", "Bananes", "Papayes", "Agrumes"]
  },
  { 
    id: "tubercules", 
    name: "Tubercules", 
    emoji: "🥔",
    color: "#92400e",
    count: 22,
    subcategories: ["Ignames", "Manioc", "Patates douces", "Taros"]
  },
  { 
    id: "elevage", 
    name: "Élevage", 
    emoji: "🐄",
    color: "#b45309",
    count: 35,
    subcategories: ["Bovins", "Ovins", "Caprins", "Porcins"]
  },
  { 
    id: "volailles", 
    name: "Aviculture", 
    emoji: "🐔",
    color: "#dc2626",
    count: 18,
    subcategories: ["Poulets", "Pintades", "Dindes", "Canards", "Oeufs"]
  },
  { 
    id: "pisciculture", 
    name: "Pisciculture", 
    emoji: "🐟",
    color: "#0284c7",
    count: 15,
    subcategories: ["Tilapia", "Carpes", "Silures", "Poissons-chats"]
  },
  { 
    id: "aquaculture", 
    name: "Aquaculture", 
    emoji: "🦐",
    color: "#0891b2",
    count: 12,
    subcategories: ["Crevettes", "Huîtres", "Spiruline", "Algues"]
  },
  { 
    id: "agribusiness", 
    name: "Agribusiness", 
    emoji: "🏭",
    color: "#7c3aed",
    count: 20,
    subcategories: ["Transformation", "Conditionnement", "Export", "Équipements"]
  },
  { 
    id: "foresterie", 
    name: "Foresterie", 
    emoji: "🌳",
    color: "#166534",
    count: 8,
    subcategories: ["Bois", "Charbon de bois", "Produits forestiers non-ligneux"]
  },
];

interface CategorySidebarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const CategorySidebar = ({ selectedCategory, onCategoryChange }: CategorySidebarProps) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  return (
    <div className="hidden lg:block w-64 bg-card border-r border-border h-[calc(100vh-80px)] sticky top-20">
      <div className="p-4 border-b border-border">
        <h2 className="font-heading font-semibold text-foreground">Catégories</h2>
      </div>
      <ScrollArea className="h-[calc(100%-60px)]">
        <div className="p-2 space-y-0.5">
          {marketplaceCategories.map((category) => (
            <div key={category.id}>
              <button
                onClick={() => {
                  onCategoryChange(category.id);
                  setExpandedCategory(expandedCategory === category.id ? null : category.id);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  selectedCategory === category.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <span className="text-lg flex-shrink-0">{category.emoji}</span>
                <span className="flex-1 text-left text-sm font-medium truncate">{category.name}</span>
                <span className={`text-xs ${selectedCategory === category.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {category.count}
                </span>
                {category.subcategories && category.subcategories.length > 0 && (
                  <ChevronRight className={`w-4 h-4 transition-transform ${
                    expandedCategory === category.id ? 'rotate-90' : ''
                  }`} />
                )}
              </button>
              
              {expandedCategory === category.id && category.subcategories && (
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
          ))}
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
  onOpenChange 
}: MobileCategorySidebarProps) => {
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
            {marketplaceCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  onCategoryChange(category.id);
                  onOpenChange(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                  selectedCategory === category.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <span className="text-xl flex-shrink-0">{category.emoji}</span>
                <span className="flex-1 text-left font-medium">{category.name}</span>
                <span className={`text-sm ${selectedCategory === category.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {category.count}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
