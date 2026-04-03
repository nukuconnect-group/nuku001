import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { Search, Loader2, ShoppingBag, MapPin, User, Calendar } from "lucide-react";

const DemandsManager = () => {
  const { formatPrice } = useLanguage();
  const [demands, setDemands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("demands")
        .select("*, profiles:profile_id(full_name, avatar_url, location)")
        .order("created_at", { ascending: false });
      setDemands(data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const filtered = demands.filter(d =>
    !search ||
    d.title?.toLowerCase().includes(search.toLowerCase()) ||
    d.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.category?.toLowerCase().includes(search.toLowerCase())
  );

  const active = demands.filter(d => d.status === "active").length;
  const totalBudget = demands.reduce((s, d) => s + Number(d.budget || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <ShoppingBag className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{demands.length}</p>
            <p className="text-[10px] text-muted-foreground">Demandes totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <ShoppingBag className="w-5 h-5 mx-auto text-green-600 mb-1" />
            <p className="text-lg font-bold">{active}</p>
            <p className="text-[10px] text-muted-foreground">Actives</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-3 text-center">
            <ShoppingBag className="w-5 h-5 mx-auto text-yellow-600 mb-1" />
            <p className="text-lg font-bold">{formatPrice(totalBudget)}</p>
            <p className="text-[10px] text-muted-foreground">Budget total</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1">
              <CardTitle className="text-sm">Demandes d'achat</CardTitle>
              <CardDescription className="text-[11px]">{filtered.length} demandes</CardDescription>
            </div>
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <div className="space-y-2">
            {filtered.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-xl border border-border/30">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {d.profiles?.avatar_url ? (
                    <img src={d.profiles.avatar_url} alt="" className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{d.title}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                    <span>{d.profiles?.full_name || "Acheteur"}</span>
                    <Badge variant="outline" className="text-[8px]">{d.category}</Badge>
                    {d.quantity && <span>{d.quantity} {d.unit || "kg"}</span>}
                    {d.location && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{d.location}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 space-y-0.5">
                  <Badge variant={d.status === "active" ? "default" : "secondary"} className="text-[9px]">
                    {d.status === "active" ? "Active" : d.status}
                  </Badge>
                  {d.budget && <p className="text-xs font-semibold text-primary">{formatPrice(d.budget)}</p>}
                  <p className="text-[9px] text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-8">
                <ShoppingBag className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Aucune demande d'achat</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemandsManager;
