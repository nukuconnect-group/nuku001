import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";

const STORAGE_KEY = "nuku_profile_leave_popup_seen";
const COOLDOWN_MS = 1000 * 60 * 60 * 24 * 3; // 3 days

/**
 * Popup de rétention style "Réactivez Premium -50%" qui apparaît
 * quand l'utilisateur quitte sa page profil/dashboard sans action.
 * Inspirée de l'image 8 fournie par l'utilisateur.
 */
export default function ProfileLeavePopup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const armedRef = useRef(false);
  const previousPathRef = useRef(location.pathname);

  // The popup only arms on these "profile" routes
  const isProfileRoute = (path: string) =>
    /^\/(tableau-de-bord|dashboard|mon-profil|profil|account|settings)/i.test(path);

  useEffect(() => {
    const wasOnProfile = isProfileRoute(previousPathRef.current);
    const isOnProfile = isProfileRoute(location.pathname);

    if (wasOnProfile && !isOnProfile && armedRef.current) {
      // User just left the profile area
      const lastSeen = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
      if (Date.now() - lastSeen > COOLDOWN_MS) {
        setOpen(true);
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      }
    }

    armedRef.current = isOnProfile;
    previousPathRef.current = location.pathname;
  }, [location.pathname]);

  const handleAccept = () => {
    setOpen(false);
    navigate("/plans");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm border-none p-0 overflow-hidden bg-gradient-to-b from-purple-50 via-purple-100 to-white dark:from-purple-950/40 dark:via-purple-900/30 dark:to-background">
        <DialogTitle className="sr-only">Offre Premium NukuConnect</DialogTitle>
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-card/60 backdrop-blur flex items-center justify-center text-foreground/70 hover:text-foreground"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-10 pb-6 text-center">
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 via-orange-400 to-pink-400 blur-md opacity-60" />
            <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-amber-400 bg-card">
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                <Sparkles className="w-12 h-12 text-primary" />
              </div>
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-amber-400" />
            <Sparkles className="absolute bottom-0 -left-3 w-4 h-4 text-amber-300" />
          </div>

          <h2 className="font-heading text-2xl font-bold text-foreground leading-tight mb-3">
            Leader, développez votre réseau plus rapidement
          </h2>

          <p className="text-sm text-foreground/80 mb-2">
            Les profils des abonnés <strong>Premium</strong> reçoivent <strong>4 fois</strong> plus de vues.
          </p>
          <p className="text-sm text-foreground/80 mb-6">
            <strong>Bonus !</strong> Participez à des conversations exclusives avec des fournisseurs vérifiés.
          </p>

          <p className="text-[11px] text-muted-foreground mb-3">Annulation facile à tout moment.</p>

          <Button
            onClick={handleAccept}
            className="w-full h-12 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-bold shadow-md"
          >
            Réactivez Premium : -50%
          </Button>

          <button
            onClick={() => setOpen(false)}
            className="mt-3 text-sm font-medium text-foreground/70 hover:text-foreground"
          >
            Non merci
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
