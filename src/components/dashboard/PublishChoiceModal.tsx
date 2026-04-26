import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Package, GraduationCap, ArrowRight } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (type: "product" | "formation") => void;
}

/**
 * Choix avant publication : Produit agricole ou Formation.
 * Affiché lorsque le fournisseur clique sur "Publier".
 */
const PublishChoiceModal = ({ open, onOpenChange, onChoose }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Que souhaitez-vous publier ?</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Choisissez le type de contenu à mettre en ligne.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <button type="button" onClick={() => onChoose("product")} className="group text-left">
            <Card className="border-2 border-border hover:border-primary/50 transition-all h-full">
              <CardContent className="p-4 sm:p-5 space-y-2">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-bold text-sm sm:text-base text-foreground">Produit agricole</h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  Vendez vos récoltes, animaux, intrants et matériels sur la marketplace.
                </p>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-primary group-hover:gap-2 transition-all">
                  Publier un produit <ArrowRight className="w-3 h-3" />
                </div>
              </CardContent>
            </Card>
          </button>

          <button type="button" onClick={() => onChoose("formation")} className="group text-left">
            <Card className="border-2 border-border hover:border-accent/50 transition-all h-full">
              <CardContent className="p-4 sm:p-5 space-y-2">
                <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-heading font-bold text-sm sm:text-base text-foreground">Formation</h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  Partagez votre savoir-faire : cours vidéo, modules pédagogiques, e-learning.
                </p>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-accent group-hover:gap-2 transition-all">
                  Publier une formation <ArrowRight className="w-3 h-3" />
                </div>
              </CardContent>
            </Card>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PublishChoiceModal;
