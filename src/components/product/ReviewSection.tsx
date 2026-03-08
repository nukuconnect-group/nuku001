import { useState } from "react";
import { Star, User, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReviews, useSubmitReview, useAverageRating } from "@/hooks/useReviews";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReviewSectionProps {
  productId: string;
}

const StarRating = ({ rating, onRate, size = "sm" }: { rating: number; onRate?: (r: number) => void; size?: "sm" | "lg" }) => {
  const [hover, setHover] = useState(0);
  const w = size === "lg" ? "w-8 h-8" : "w-3.5 h-3.5";
  const gap = size === "lg" ? "gap-1" : "gap-0.5";
  return (
    <div className={`flex items-center ${gap}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRate?.(i);
          }}
          onTouchEnd={(e) => {
            if (onRate) {
              e.preventDefault();
              onRate(i);
            }
          }}
          onMouseEnter={() => onRate && setHover(i)}
          onMouseLeave={() => onRate && setHover(0)}
          className={`${onRate ? "cursor-pointer" : "cursor-default"} ${size === "lg" ? "p-1" : ""} select-none`}
          disabled={!onRate}
        >
          <Star className={`${w} ${i <= (hover || rating) ? "text-accent fill-accent" : "text-muted-foreground/40"} transition-colors`} />
        </button>
      ))}
      {size === "lg" && rating > 0 && (
        <span className="text-sm font-medium text-accent ml-2">{rating}/5</span>
      )}
    </div>
  );
};

const ReviewSection = ({ productId }: ReviewSectionProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: reviews, isLoading } = useReviews(productId);
  const { average, count } = useAverageRating(productId);
  const submitReview = useSubmitReview();
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async () => {
    if (newRating === 0) {
      toast({ title: "Note requise", description: "Veuillez sélectionner une note", variant: "destructive" });
      return;
    }
    try {
      await submitReview.mutateAsync({ productId, rating: newRating, comment: newComment });
      toast({ title: "Merci !", description: "Votre avis a été enregistré" });
      setNewRating(0);
      setNewComment("");
      setShowForm(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message?.includes("Not authenticated") ? "Connectez-vous pour laisser un avis" : e.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-accent fill-accent" />
            Avis clients
          </CardTitle>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setShowForm(!showForm)}>
            <Send className="w-3 h-3" />Donner mon avis
          </Button>
        </div>
        {count > 0 && (
          <div className="flex items-center gap-3 mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-foreground">{average.toFixed(1)}</span>
            <div>
              <StarRating rating={Math.round(average)} />
              <p className="text-xs text-muted-foreground mt-0.5">{count} avis</p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="p-3 sm:p-4 bg-muted rounded-xl space-y-3 animate-fade-in">
            <div>
              <p className="text-xs font-medium mb-1.5">Votre note</p>
              <StarRating rating={newRating} onRate={setNewRating} size="lg" />
            </div>
            <Textarea
              placeholder="Partagez votre expérience..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] text-sm"
            />
            <Button variant="hero" size="sm" className="gap-1.5 text-xs" onClick={handleSubmit} disabled={submitReview.isPending}>
              <Send className="w-3 h-3" />{submitReview.isPending ? "Envoi..." : "Publier"}
            </Button>
          </div>
        )}

        {isLoading ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Chargement...</p>
        ) : reviews && reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="flex gap-3 p-3 rounded-lg border border-border">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {review.profiles?.avatar_url ? (
                    <img src={review.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium">{review.profiles?.full_name || "Utilisateur"}</span>
                    <StarRating rating={review.rating} />
                  </div>
                  {review.comment && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{review.comment}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(review.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-4 text-center">Aucun avis pour le moment. Soyez le premier !</p>
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewSection;
