import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, AlertTriangle, Loader2, ShieldAlert } from "lucide-react";

const DeleteAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isReady } = useProfile();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const handleDelete = async () => {
    if (confirmText.trim() !== "SUPPRIMER") {
      toast({
        title: "Confirmation incorrecte",
        description: 'Tapez exactement "SUPPRIMER" en majuscules pour confirmer.',
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user-account", { body: {} });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setDeleted(true);
      await supabase.auth.signOut();
      toast({ title: "Compte supprimé", description: "Votre compte a été définitivement supprimé." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (deleted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <CardContent className="p-8">
              <Trash2 className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-lg font-bold mb-2">Compte supprimé</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Votre compte et toutes vos données ont été définitivement supprimés.
              </p>
              <Button onClick={() => navigate("/")} variant="outline">
                Retour à l'accueil
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title="Supprimer mon compte — Nukuconnect" description="Supprimer définitivement votre compte Nukuconnect et toutes vos données." />
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/30">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="w-7 h-7 text-destructive" />
            </div>
            <CardTitle className="text-lg text-destructive">Supprimer mon compte</CardTitle>
            <CardDescription className="text-sm">
              Cette action est <strong>irréversible</strong>. Toutes vos données personnelles, commandes, produits et historiques seront définitivement effacés.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!user && isReady ? (
              <div className="text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Vous devez être connecté pour supprimer votre compte.
                </p>
                <Button onClick={() => navigate("/auth")} variant="outline">
                  Se connecter
                </Button>
              </div>
            ) : (
              <>
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                  <p>• Tous vos produits seront retirés de la marketplace</p>
                  <p>• Votre historique de commandes sera effacé</p>
                  <p>• Vos conversations seront supprimées</p>
                  <p>• Cette action ne peut pas être annulée</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold">
                    Tapez <span className="text-destructive font-bold">SUPPRIMER</span> pour confirmer
                  </Label>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="SUPPRIMER"
                    className="mt-1.5"
                  />
                </div>
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  disabled={confirmText.trim() !== "SUPPRIMER" || isDeleting}
                  onClick={handleDelete}
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Supprimer définitivement
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default DeleteAccount;
