import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { purgePersistedCache, setPersistUserScope } from "@/lib/offlinePersistence";

/**
 * AuthCacheGuard — sécurité critique.
 *
 * Vide entièrement le cache React Query (et le cache persistant localStorage)
 * chaque fois que l'identité de l'utilisateur change : logout, login,
 * ou bascule d'un compte vers un autre sur le même navigateur.
 *
 * Sans ce garde, les données mises en cache par l'utilisateur A
 * (commandes, notifications, wallet, KYC, etc.) pourraient rester
 * visibles quelques secondes pour l'utilisateur B, ou pire, être
 * ressorties depuis localStorage au rechargement.
 */
const AuthCacheGuard = () => {
  const qc = useQueryClient();
  const currentUserRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // État initial : lit la session actuelle et mémorise l'utilisateur.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      currentUserRef.current = uid;
      // Assure que la portée persistante correspond dès le boot.
      setPersistUserScope(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUid = session?.user?.id ?? null;
      const prevUid = currentUserRef.current;

      // Ignorer l'événement INITIAL_SESSION quand il confirme simplement
      // l'utilisateur déjà connu.
      if (prevUid === undefined) {
        currentUserRef.current = nextUid;
        setPersistUserScope(nextUid);
        return;
      }

      if (prevUid === nextUid) return;

      // L'utilisateur a changé → purger tout état lié à l'ancien.
      currentUserRef.current = nextUid;
      setPersistUserScope(nextUid);

      try {
        qc.cancelQueries();
        qc.clear();
      } catch {
        /* ignore */
      }
      purgePersistedCache();
    });

    return () => sub.subscription.unsubscribe();
  }, [qc]);

  return null;
};

export default AuthCacheGuard;
