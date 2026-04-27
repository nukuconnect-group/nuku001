import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Pencil,
  Plus,
  Check,
  Home,
  Building2,
  LocateFixed,
  Truck,
} from "lucide-react";

interface Address {
  id: string;
  label: string;
  city: string | null;
  quarter: string | null;
  street: string | null;
  country: string | null;
  is_default: boolean | null;
}

interface Props {
  /** Origine du produit (fallback si l'utilisateur n'a pas d'adresse). */
  productLocation?: string;
}

const GUEST_ZONE_KEY = "nuku.buyer_delivery_zone";

/**
 * Bloc "Lieu de livraison" affiché sur la fiche produit.
 * - Si l'utilisateur est connecté avec adresses : affiche son adresse par
 *   défaut + bouton pour changer parmi ses adresses.
 * - Sinon : champ libre (sauvegardé en localStorage) + géolocalisation
 *   navigateur en option.
 * Le tout sans quitter la page produit.
 */
export default function BuyerDeliveryZone({ productLocation }: Props) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guestZone, setGuestZone] = useState<string>("");
  const [guestDraft, setGuestDraft] = useState<string>("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setAuthed(false);
        const stored =
          typeof window !== "undefined"
            ? localStorage.getItem(GUEST_ZONE_KEY) || ""
            : "";
        setGuestZone(stored);
        setGuestDraft(stored);
        setLoading(false);
        return;
      }
      setAuthed(true);
      const { data } = await supabase
        .from("delivery_addresses")
        .select("id,label,city,quarter,street,country,is_default")
        .eq("user_id", session.user.id)
        .order("is_default", { ascending: false });
      const list = (data || []) as Address[];
      setAddresses(list);
      const def = list.find((a) => a.is_default) || list[0];
      if (def) setSelectedId(def.id);
      setLoading(false);
    };
    load();
  }, []);

  const selected = addresses.find((a) => a.id === selectedId) || null;
  const formatAddress = (a: Address) =>
    [a.quarter, a.street, a.city, a.country].filter(Boolean).join(", ") ||
    a.label;

  const labelIcon = (label: string) =>
    label.toLowerCase().includes("bureau") ? (
      <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
    ) : (
      <Home className="w-3.5 h-3.5" aria-hidden="true" />
    );

  const saveGuestZone = (val: string) => {
    setGuestZone(val);
    if (typeof window !== "undefined") {
      localStorage.setItem(GUEST_ZONE_KEY, val);
    }
  };

  const detectGeo = () => {
    if (!("geolocation" in navigator)) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=14&accept-language=fr`,
          );
          const j = await r.json();
          const a = j.address || {};
          const zone = [
            a.suburb || a.neighbourhood || a.village,
            a.city || a.town || a.county,
            a.country,
          ]
            .filter(Boolean)
            .join(", ");
          if (zone) {
            setGuestDraft(zone);
            saveGuestZone(zone);
          }
        } catch {
          /* ignore */
        } finally {
          setGeoLoading(false);
        }
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  };

  /* ---------- Render ---------- */

  if (loading) {
    return (
      <Card
        className="border-primary/20"
        role="status"
        aria-live="polite"
        aria-label="Chargement du lieu de livraison"
      >
        <CardContent className="p-3">
          <div className="h-5 w-40 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // ---- Authenticated user ----
  if (authed) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-primary" aria-hidden="true" />
              Livrer à
            </p>
            {addresses.length > 0 ? (
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] gap-1 px-2"
                    aria-label="Modifier la zone de livraison"
                  >
                    <Pencil className="w-3 h-3" aria-hidden="true" />
                    Modifier
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-72 p-2 space-y-1.5"
                >
                  <p className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground px-1">
                    Mes adresses
                  </p>
                  {addresses.map((a) => {
                    const isSel = a.id === selectedId;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(a.id);
                          setPopoverOpen(false);
                        }}
                        aria-pressed={isSel}
                        className={`w-full text-left p-2 rounded-md border transition-all ${
                          isSel
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={
                              isSel
                                ? "text-primary mt-0.5"
                                : "text-muted-foreground mt-0.5"
                            }
                          >
                            {labelIcon(a.label)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-foreground">
                                {a.label}
                              </span>
                              {a.is_default && (
                                <Badge
                                  variant="secondary"
                                  className="text-[8px] px-1 py-0"
                                >
                                  Par défaut
                                </Badge>
                              )}
                              {isSel && (
                                <Check
                                  className="w-3.5 h-3.5 text-primary ml-auto"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {formatAddress(a)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  <Link
                    to="/adresse-livraison"
                    className="block"
                    onClick={() => setPopoverOpen(false)}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-[10px] gap-1 mt-1"
                    >
                      <Plus className="w-3 h-3" aria-hidden="true" />
                      Gérer mes adresses
                    </Button>
                  </Link>
                </PopoverContent>
              </Popover>
            ) : (
              <Link to="/adresse-livraison">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] gap-1 px-2"
                >
                  <Plus className="w-3 h-3" aria-hidden="true" />
                  Ajouter
                </Button>
              </Link>
            )}
          </div>

          {selected ? (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/40 border border-border">
              <MapPin
                className="w-4 h-4 text-primary mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {selected.label}
                  {selected.is_default && (
                    <Badge
                      variant="secondary"
                      className="text-[8px] px-1 py-0 ml-1.5"
                    >
                      Par défaut
                    </Badge>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {formatAddress(selected)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Aucune adresse enregistrée — ajoutez-en une pour estimer la
              livraison.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // ---- Guest user ----
  const displayed = guestZone || productLocation || "";
  return (
    <Card className="border-primary/20">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-primary" aria-hidden="true" />
            Livrer à
          </p>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] gap-1 px-2"
                aria-label="Modifier la zone de livraison"
              >
                <Pencil className="w-3 h-3" aria-hidden="true" />
                Modifier
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-3 space-y-2">
              <label
                htmlFor="guest-zone-input"
                className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground"
              >
                Votre zone de livraison
              </label>
              <Input
                id="guest-zone-input"
                value={guestDraft}
                onChange={(e) => setGuestDraft(e.target.value)}
                placeholder="Ex : Tokoin, Lomé, Togo"
                className="h-8 text-xs"
              />
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={detectGeo}
                  disabled={geoLoading}
                  className="flex-1 h-7 text-[10px] gap-1"
                >
                  <LocateFixed className="w-3 h-3" aria-hidden="true" />
                  {geoLoading ? "Détection…" : "Me localiser"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    saveGuestZone(guestDraft.trim());
                    setPopoverOpen(false);
                  }}
                  className="flex-1 h-7 text-[10px]"
                >
                  Enregistrer
                </Button>
              </div>
              <p className="text-[9px] text-muted-foreground">
                <Link to="/auth" className="text-primary hover:underline">
                  Connectez-vous
                </Link>{" "}
                pour utiliser vos adresses enregistrées.
              </p>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/40 border border-border">
          <MapPin
            className="w-4 h-4 text-primary mt-0.5 flex-shrink-0"
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            {displayed ? (
              <>
                <p className="text-xs font-medium text-foreground truncate">
                  {displayed}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {guestZone
                    ? "Zone choisie"
                    : "Origine du produit (par défaut)"}
                </p>
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Indiquez votre zone pour estimer la livraison.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
