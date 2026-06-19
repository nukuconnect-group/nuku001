import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, User, UserPlus, UserCheck, MessageCircle } from "lucide-react";
import LocationBadge from "@/components/profile/LocationBadge";
import { useFollows } from "@/hooks/useFollows";
import { useProfile } from "@/contexts/ProfileContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export interface ProducerLite {
  id: string;
  user_id?: string;
  name: string;
  avatar?: string | null;
  cover?: string | null;
  location: string;
  verified: boolean;
  products: number;
  sales: number;
  bio?: string;
  followers: number;
  createdAt?: string;
}

interface Props {
  producer: ProducerLite;
  /** Compact variant for carousels (no bio, smaller stats) */
  compact?: boolean;
  /** Index used to stagger the fade-in animation */
  index?: number;
}

export default function ProducerCard({ producer, compact = false, index = 0 }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user, profile: myProfile } = useProfile();
  const { isFollowing, toggleFollow, isPending } = useFollows();

  const following = isFollowing(producer.id);
  const isSelf = myProfile?.id === producer.id;
  const profileHref = `/producteurs/${encodeURIComponent(producer.name || producer.id)}`;

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate("/auth?returnTo=/producteurs"); return; }
    if (isSelf) return;
    try {
      await toggleFollow(producer.id);
      toast({
        title: following ? t("net.unsubscribed") : t("net.subscribed"),
        description: following
          ? `${t("net.unsubscribeNotif")} ${producer.name}.`
          : `${t("net.subscribeNotif")} ${producer.name}.`,
      });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  };

  const handleContact = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate("/auth?returnTo=/producteurs"); return; }
    const greeting = encodeURIComponent(`Bonjour ${producer.name}, je vous contacte via NukuConnect pour discuter de vos produits.`);
    navigate(`/messages?contact=${producer.id}&prefill=${greeting}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.4), ease: "easeOut" }}
      className="h-full"
    >
      <Link to={profileHref} className="block group h-full">
        <Card className="overflow-hidden h-full border-border/40 hover:border-primary/30 hover:shadow-elevated transition-all duration-300">
          <div className="relative h-20 sm:h-24 overflow-hidden bg-muted">
            {producer.cover ? (
              <img src={producer.cover} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
            <div className="absolute top-2 right-2">
              {producer.verified ? (
                <Badge className="bg-emerald-500/95 text-white text-[8px] px-1.5 py-0.5 gap-0.5 shadow-sm border-0">
                  <ShieldCheck className="w-2.5 h-2.5" /> Vérifié
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-card/80 text-muted-foreground text-[8px] px-1.5 py-0.5 shadow-sm border-border">
                  Non vérifié
                </Badge>
              )}
            </div>
          </div>

          <div className="flex justify-center -mt-8 relative z-10">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-[3px] border-card shadow-lg bg-card flex items-center justify-center">
              {producer.avatar ? (
                <img
                  src={producer.avatar}
                  alt={producer.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="w-full h-full rounded-full border-2 border-muted-foreground/40 flex items-center justify-center">
                  <User className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground/60" strokeWidth={1.5} />
                </div>
              )}
            </div>
          </div>

          <CardContent className={`p-2.5 sm:p-3 pt-1.5 text-center ${compact ? 'space-y-1' : 'space-y-1.5'}`}>
            <h3 className="font-heading font-bold text-foreground text-xs sm:text-sm truncate">{producer.name}</h3>
            <div className="flex justify-center">
              <LocationBadge location={producer.location} size="sm" />
            </div>

            <div className="flex items-center justify-center gap-3 py-1.5">
              <div className="text-center">
                <p className="text-xs sm:text-sm font-bold text-primary">{producer.products}</p>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Produits</p>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="text-center">
                <p className="text-xs sm:text-sm font-bold text-primary">{producer.sales}</p>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Ventes</p>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="text-center">
                <p className="text-xs sm:text-sm font-bold text-primary">{producer.followers}</p>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Abonnés</p>
              </div>
            </div>

            {!compact && producer.bio && (
              <p className="text-[9px] sm:text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{producer.bio}</p>
            )}

            <div className="flex gap-1.5 pt-1">
              {!isSelf && (
                <Button
                  variant={following ? "secondary" : "hero"}
                  size="sm"
                  className="flex-1 text-[9px] sm:text-[10px] h-7 gap-1"
                  onClick={handleFollow}
                  disabled={isPending}
                >
                  {following ? (
                    <><UserCheck className="w-3 h-3" /><span>{t("net.following")}</span></>
                  ) : (
                    <><UserPlus className="w-3 h-3" />{t("net.follow")}</>
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[9px] sm:text-[10px] gap-1"
                onClick={handleContact}
                aria-label={`Contacter ${producer.name}`}
              >
                <MessageCircle className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
