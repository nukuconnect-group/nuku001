import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * GoogleAuthHandler — gère la première connexion Google.
 *
 * - Empêche la création d'un doublon de profil (RPC idempotente `ensure_my_profile`).
 * - Si un compte existe déjà avec la même adresse e-mail, informe clairement
 *   l'utilisateur qu'il a été connecté à ce compte existant.
 * - Envoie l'e-mail de bienvenue à la toute première connexion Google et
 *   invite l'utilisateur à compléter son profil.
 */
const PROCESSED_KEY = (uid: string) => `nuku-google-onboarded:${uid}`;

const GoogleAuthHandler = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const running = useRef(false);

  useEffect(() => {
    const handle = async (session: any) => {
      const user = session?.user;
      if (!user || running.current) return;

      const provider = user.app_metadata?.provider;
      const providers: string[] = user.app_metadata?.providers || [];
      if (provider !== "google" && !providers.includes("google")) return;
      if (localStorage.getItem(PROCESSED_KEY(user.id))) return;

      running.current = true;
      try {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id, full_name, user_type, phone, location")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existing) {
          // Compte déjà existant (même e-mail) → aucune création de doublon.
          localStorage.setItem(PROCESSED_KEY(user.id), "1");
          if (providers.length > 1) {
            toast({
              title: "Compte existant retrouvé",
              description: `Un compte existe déjà avec ${user.email}. Vous avez été connecté à ce compte — aucun doublon n'a été créé.`,
            });
          }
          return;
        }

        // Première connexion Google → création idempotente du profil.
        const { error: rpcError } = await supabase.rpc("ensure_my_profile");
        if (rpcError) {
          console.warn("[GoogleAuth] ensure_my_profile:", rpcError.message);
        }

        const fullName =
          user.user_metadata?.full_name || user.user_metadata?.name || "";

        // E-mail de bienvenue (idempotent côté serveur via idempotencyKey).
        supabase.functions
          .invoke("send-transactional-email", {
            body: {
              templateName: "welcome",
              recipientEmail: user.email,
              idempotencyKey: `welcome-${user.id}`,
              templateData: { name: fullName, userType: "buyer" },
            },
          })
          .catch(() => {});

        localStorage.setItem(PROCESSED_KEY(user.id), "1");
        toast({
          title: "Bienvenue sur NukuConnect 🌱",
          description:
            "Votre compte a été créé. Complétez votre profil pour profiter de toutes les fonctionnalités.",
        });
        navigate("/settings");
      } catch (e) {
        console.warn("[GoogleAuth] onboarding failed:", e);
      } finally {
        running.current = false;
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => handle(session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") handle(session);
    });
    return () => sub.subscription.unsubscribe();
  }, [toast, navigate]);

  return null;
};

export default GoogleAuthHandler;
