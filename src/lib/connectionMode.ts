/**
 * Détection du mode "faible connexion".
 *
 * - "low"  : saveData activé OU effectiveType ∈ {slow-2g, 2g}
 *            → aucun préchargement agressif. Préchargement uniquement au focus clavier.
 * - "mid"  : effectiveType = 3g
 *            → pas de préchargement automatique des routes probables.
 *              Préchargement au focus + au touchstart (intention forte), pas au survol.
 * - "fast" : 4g / inconnu
 *            → comportement normal (hover, focus, touch, prefetch idle).
 */

export type ConnectionMode = "low" | "mid" | "fast";

export const getConnectionMode = (): ConnectionMode => {
  const conn = (navigator as any).connection;
  if (!conn) return "fast";
  if (conn.saveData) return "low";
  const et = conn.effectiveType as string | undefined;
  if (et === "slow-2g" || et === "2g") return "low";
  if (et === "3g") return "mid";
  return "fast";
};

export const isLowConnection = () => getConnectionMode() === "low";
export const isAggressivePrefetchAllowed = () => getConnectionMode() === "fast";

/** S'abonne aux changements d'état réseau (ex: passage 4G → 3G). */
export const onConnectionChange = (cb: (mode: ConnectionMode) => void): (() => void) => {
  const conn = (navigator as any).connection;
  if (!conn?.addEventListener) return () => {};
  const handler = () => cb(getConnectionMode());
  conn.addEventListener("change", handler);
  return () => conn.removeEventListener("change", handler);
};
