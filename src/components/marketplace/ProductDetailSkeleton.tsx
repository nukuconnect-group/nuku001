import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton complet pour la page détail produit */
export const ProductDetailSkeleton = () => (
  <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-6">
    {/* Breadcrumb */}
    <div className="flex gap-2 items-center">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-3 w-3 rounded-full" />
      <Skeleton className="h-3 w-20" />
    </div>

    <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Galerie images */}
      <div className="space-y-2">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-16 h-16 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Infos produit */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-7 sm:h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        <Skeleton className="h-10 w-40" />

        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>

        {/* Vendeur card */}
        <div className="border border-border rounded-xl p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>

        {/* Boutons action */}
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1 rounded-md" />
          <Skeleton className="h-11 flex-1 rounded-md" />
        </div>
      </div>
    </div>

    {/* Section avis / similaires */}
    <div className="space-y-3 pt-4">
      <Skeleton className="h-5 w-40" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** Bandeau "données mises en cache" (mode offline / lent) */
export const CachedDataBanner = ({ cachedAt, onRefresh }: { cachedAt: number; onRefresh?: () => void }) => {
  const minutes = Math.round((Date.now() - cachedAt) / 60000);
  const label =
    minutes < 1 ? "à l'instant" : minutes < 60 ? `il y a ${minutes} min` : `il y a ${Math.round(minutes / 60)}h`;
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-3 py-2 text-xs flex items-center justify-between gap-2 text-amber-900 dark:text-amber-200">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Données en cache ({label}) — connexion lente détectée
      </span>
      {onRefresh && (
        <button onClick={onRefresh} className="underline font-medium hover:no-underline">
          Actualiser
        </button>
      )}
    </div>
  );
};
