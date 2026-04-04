import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface DriverRatingModalProps {
  deliveryId: string;
  driverId: string;
  driverName: string;
  trigger: React.ReactNode;
  onRated?: () => void;
}

const DriverRatingModal = ({ deliveryId, driverId, driverName, trigger, onRated }: DriverRatingModalProps) => {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { toast.error("Veuillez sélectionner une note"); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { toast.error("Connexion requise"); return; }

      const { error } = await supabase.from("driver_ratings").insert({
        delivery_id: deliveryId,
        driver_id: driverId,
        user_id: session.user.id,
        rating,
        comment: comment.trim() || null,
      });

      if (error) {
        if (error.code === "23505") toast.error("Vous avez déjà noté cette livraison");
        else throw error;
      } else {
        toast.success("Merci pour votre évaluation !");
        setOpen(false);
        setRating(0);
        setComment("");
        onRated?.();
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la notation");
    } finally {
      setLoading(false);
    }
  };

  const labels = ["", "Très mauvais", "Mauvais", "Correct", "Bon", "Excellent"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-base">Noter {driverName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hover || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
            {(hover || rating) > 0 && (
              <p className="text-sm font-medium text-primary">{labels[hover || rating]}</p>
            )}
          </div>

          <Textarea
            placeholder="Commentaire optionnel (ponctualité, amabilité...)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="text-sm"
          />

          <Button
            variant="hero"
            className="w-full"
            onClick={handleSubmit}
            disabled={loading || rating === 0}
          >
            {loading ? "Envoi..." : "Envoyer mon avis"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DriverRatingModal;
