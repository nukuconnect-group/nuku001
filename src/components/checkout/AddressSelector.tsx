import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Home, Building2, Check, Plus, Loader2, Navigation } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Address {
  id: string;
  label: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  quarter: string | null;
  street: string | null;
  country: string | null;
  is_default: boolean | null;
}

interface Props {
  onSelect: (address: Address) => void;
  selectedId?: string;
}

const AddressSelector = ({ onSelect, selectedId }: Props) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data } = await supabase
        .from("delivery_addresses")
        .select("*")
        .eq("user_id", session.user.id)
        .order("is_default", { ascending: false });

      setAddresses(data || []);
      setLoading(false);

      // Auto-select default address immediately to pre-fill delivery zone
      if (data?.length && !selectedId) {
        const def = data.find(a => a.is_default) || data[0];
        // Slight delay to ensure parent state is ready
        setTimeout(() => onSelect(def), 100);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return null;
  if (addresses.length === 0) {
    return (
      <Card className="border-dashed border-primary/30">
        <CardContent className="p-4 text-center">
          <MapPin className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground mb-3">Aucune adresse enregistrée</p>
          <Link to="/adresse-livraison">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" />Ajouter une adresse
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const labelIcon = (label: string) => {
    if (label.toLowerCase().includes("bureau")) return <Building2 className="w-3.5 h-3.5" />;
    return <Home className="w-3.5 h-3.5" />;
  };

  return (
    <Card>
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-xs sm:text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Adresse de livraison
          </span>
          <Link to="/adresse-livraison">
            <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 gap-1">
              <Plus className="w-3 h-3" />Gérer
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-2">
        {addresses.map((addr) => {
          const isSelected = selectedId === addr.id;
          const addressLine = [addr.quarter, addr.street, addr.city, addr.country].filter(Boolean).join(", ");

          return (
            <button
              key={addr.id}
              onClick={() => onSelect(addr)}
              className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-primary/30 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start gap-2">
                <div className={`mt-0.5 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                  {labelIcon(addr.label)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-medium text-foreground">{addr.label}</span>
                    {addr.is_default && (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0">Par défaut</Badge>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary ml-auto flex-shrink-0" />}
                  </div>
                  {addr.full_name && (
                    <p className="text-[10px] text-foreground">{addr.full_name}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground truncate">{addressLine}</p>
                  {addr.phone && (
                    <p className="text-[10px] text-muted-foreground">{addr.phone}</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default AddressSelector;
