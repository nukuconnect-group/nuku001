import { Link } from "react-router-dom";
import { Building2, MapPin, Star, Clock, Award, Truck, TrendingUp, MessageCircle, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "./VerifiedBadge";
import { producerShopUrl } from "@/lib/producerLinks";

export interface SellerCardProps {
  /** business_name (preferred) or fallback name already resolved upstream */
  businessName: string;
  /** Profile UUID — preferred routing target ("Voir la boutique"). */
  producerId?: string;
  avatarUrl: string;
  verified: boolean;
  rating?: number;
  location?: string;
  /** Click handler for the "Contacter" button (opens chat) */
  onContact?: () => void;
  /** When true, hides the trust badges row (compact version) */
  compact?: boolean;
}

/**
 * Standardised supplier card used on every product detail / supplier
 * surface. Wording is unified ("Fournisseur", "Nom de l'entreprise",
 * "Voir la boutique", "Contacter") and the link routes to
 * `/producteurs/:business_name`.
 */
export default function SellerCard({
  businessName,
  producerId,
  avatarUrl,
  verified,
  rating,
  location,
  onContact,
  compact = false,
}: SellerCardProps) {
  // Prefer routing by UUID (unambiguous, always resolvable) — fall back to the
  // business_name-based slug only when the caller didn't provide an id. This
  // eliminates the "Boutique introuvable" state triggered by name mismatches.
  const isUUID = !!producerId && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(producerId);
  const shopUrl = isUUID
    ? `/producteurs/${encodeURIComponent(producerId!)}`
    : producerShopUrl(businessName);

  return (
    <Card
      className="border-primary/20 overflow-hidden"
      role="region"
      aria-label={`Fiche du fournisseur ${businessName}`}
    >
      {/* Header band */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border">
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-primary">
          <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
          Fournisseur
        </div>
        <VerifiedBadge verified={verified} variant="compact" />
      </div>

      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <img
              src={avatarUrl}
              alt={`Logo ou photo de ${businessName}`}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border-2 border-card shadow-soft"
            />
            {verified && (
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-card shadow-md"
                role="img"
                aria-label="Fournisseur vérifié"
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">
              Nom de l'entreprise
            </p>
            <h3 className="font-heading text-sm sm:text-base font-bold text-foreground truncate leading-tight">
              {businessName}
            </h3>

            <div className="flex items-center gap-2 mt-1.5 text-[10px] sm:text-[11px] text-muted-foreground flex-wrap">
              {typeof rating === "number" && (
                <>
                  <span className="flex items-center gap-0.5" aria-label={`Note ${rating} sur 5`}>
                    <Star className="w-3 h-3 text-accent fill-accent" aria-hidden="true" />
                    <span className="font-semibold text-foreground">{rating}</span>
                    <span className="text-muted-foreground">/5</span>
                  </span>
                  <span className="text-border" aria-hidden="true">|</span>
                </>
              )}
              {location && (
                <>
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" aria-hidden="true" />
                    {location}
                  </span>
                  <span className="text-border" aria-hidden="true">|</span>
                </>
              )}
              <span className="flex items-center gap-0.5 text-primary font-medium">
                <Clock className="w-3 h-3" aria-hidden="true" /> Réponse rapide
              </span>
            </div>
          </div>
        </div>

        {!compact && (
          <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-border">
            <div className="flex flex-col items-center text-center p-1.5 rounded-md bg-muted/40">
              <Award className="w-3.5 h-3.5 text-primary mb-0.5" aria-hidden="true" />
              <span className="text-[9px] font-semibold text-foreground leading-tight">Qualité contrôlée</span>
            </div>
            <div className="flex flex-col items-center text-center p-1.5 rounded-md bg-muted/40">
              <Truck className="w-3.5 h-3.5 text-primary mb-0.5" aria-hidden="true" />
              <span className="text-[9px] font-semibold text-foreground leading-tight">Livraison interne</span>
            </div>
            <div className="flex flex-col items-center text-center p-1.5 rounded-md bg-muted/40">
              <TrendingUp className="w-3.5 h-3.5 text-primary mb-0.5" aria-hidden="true" />
              <span className="text-[9px] font-semibold text-foreground leading-tight">Transactions sûres</span>
            </div>
          </div>
        )}

        <div className="flex gap-1.5 mt-3">
          <Link to={shopUrl} className="flex-1" aria-label={`Voir la boutique de ${businessName}`}>
            <Button variant="outline" size="sm" className="w-full gap-1 text-[10px] h-8">
              <User className="w-3 h-3" aria-hidden="true" /> Voir la boutique
            </Button>
          </Link>
          {onContact && (
            <Button
              variant="hero"
              size="sm"
              className="flex-1 gap-1 text-[10px] h-8"
              onClick={onContact}
              aria-label={`Discuter avec le fournisseur ${businessName}`}
            >
              <MessageCircle className="w-3 h-3" aria-hidden="true" /> Discuter
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
