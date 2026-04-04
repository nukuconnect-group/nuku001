import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ProductCardSkeleton = () => (
  <Card className="overflow-hidden h-full flex flex-col w-full rounded-none sm:rounded-xl shadow-none border-border/40 bg-card">
    <div className="relative aspect-square overflow-hidden bg-muted">
      <Skeleton className="w-full h-full rounded-none" />
    </div>
    <CardContent className="p-2.5 sm:p-3 flex-1 flex flex-col gap-1.5">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-2.5 w-16 mt-auto" />
      <div className="flex items-center gap-1.5 pt-1.5 mt-0.5 border-t border-border/50">
        <Skeleton className="w-4 h-4 rounded-full" />
        <Skeleton className="h-2.5 w-20" />
      </div>
    </CardContent>
  </Card>
);

export const ProductGridSkeleton = ({ count = 10 }: { count?: number }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
);

export default ProductCardSkeleton;
