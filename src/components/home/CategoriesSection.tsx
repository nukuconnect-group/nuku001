import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useCategories";
import { Loader2 } from "lucide-react";
import * as LucideIcons from "lucide-react";

const CategoriesSection = () => {
  const { data: categories = [], isLoading } = useCategories();

  const activeCategories = categories.filter((c: any) => c.is_active).slice(0, 12);

  if (isLoading) {
    return (
      <section className="py-6 sm:py-10 bg-background">
        <div className="container mx-auto px-3 sm:px-4 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (activeCategories.length === 0) return null;

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.LayoutGrid;
  };

  return (
    <section className="py-6 sm:py-10 bg-background">
      <div className="container mx-auto px-3 sm:px-4">
        <h2 className="font-heading text-sm sm:text-lg lg:text-2xl font-bold text-foreground mb-4 sm:mb-6">
          Catégories
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
          {activeCategories.map((cat: any) => {
            const IconComp = getIcon(cat.icon || "LayoutGrid");
            return (
              <Link
                key={cat.id}
                to={`/marketplace?category=${encodeURIComponent(cat.name)}`}
                className="flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl bg-muted/50 hover:bg-primary/10 hover:shadow-soft transition-all duration-200 group"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <span className="text-lg sm:text-xl">{cat.emoji || "📦"}</span>
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-foreground text-center leading-tight line-clamp-2">
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
