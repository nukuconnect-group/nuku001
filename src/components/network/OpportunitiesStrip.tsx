import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Megaphone, ArrowRight, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

export default function OpportunitiesStrip() {
  const { formatPrice } = useLanguage();

  const { data: demands = [], isLoading } = useQuery({
    queryKey: ["network-opportunities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("demands")
        .select("id, title, category, location, quantity, unit, budget_max, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8);
      return data || [];
    },
    staleTime: 1000 * 60,
  });

  if (!isLoading && demands.length === 0) return null;

  return (
    <section className="py-4 sm:py-5 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 border-y border-border/40">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-end justify-between mb-3 gap-3">
          <div>
            <h2 className="font-heading text-sm sm:text-base font-bold flex items-center gap-1.5 text-foreground">
              <Megaphone className="w-4 h-4 text-accent" />
              Opportunités du marché
            </h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              Demandes actives des acheteurs — répondez directement
            </p>
          </div>
          <Link to="/marketplace?tab=demands">
            <Button variant="outline" size="sm" className="h-8 text-[10px] sm:text-xs gap-1">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto snap-x scrollbar-hide pb-2 -mx-3 sm:-mx-4 px-3 sm:px-4" style={{ scrollbarWidth: "none" }}>
            {demands.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
                className="snap-start flex-shrink-0 w-[240px] sm:w-[280px]"
              >
                <Card className="h-full border-accent/20 hover:border-accent/50 hover:shadow-elevated transition-all">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="text-[9px] text-accent border-accent/40 bg-accent/5">
                        {d.category}
                      </Badge>
                      {d.budget_max && (
                        <span className="text-[10px] font-bold text-primary whitespace-nowrap">
                          ≤ {formatPrice(Number(d.budget_max))}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                      {d.title}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5 truncate">
                        <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                        {d.location || "—"}
                      </span>
                      {d.quantity && (
                        <span className="font-medium text-foreground whitespace-nowrap">
                          {d.quantity} {d.unit || ""}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
