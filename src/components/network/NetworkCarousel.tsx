import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  accentClass?: string;
  children: ReactNode;
  /** Optional CTA shown next to the title */
  cta?: ReactNode;
}

/**
 * Horizontal scroll-snap carousel for the Networks module.
 * - Mobile: native touch scroll with snap
 * - Desktop: arrow buttons paginate by ~80% of viewport width
 */
export default function NetworkCarousel({ title, subtitle, icon, accentClass = "text-primary", children, cta }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const delta = Math.round(el.clientWidth * 0.8) * dir;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section className="py-4 sm:py-5">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-end justify-between mb-3 gap-3">
          <div className="min-w-0">
            <h2 className={`font-heading text-sm sm:text-base font-bold flex items-center gap-1.5 ${accentClass}`}>
              {icon}
              {title}
            </h2>
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {cta}
            <div className="hidden md:flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => scrollBy(-1)}
                aria-label="Précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => scrollBy(1)}
                aria-label="Suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-3 sm:-mx-4 px-3 sm:px-4"
          style={{ scrollbarWidth: "none" }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
