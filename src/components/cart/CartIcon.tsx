import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "./CartContext";
import { Badge } from "@/components/ui/badge";

interface CartIconProps {
  showBadgeOnly?: boolean;
}

const CartIcon = ({ showBadgeOnly }: CartIconProps) => {
  const { itemCount } = useCart();

  if (showBadgeOnly) {
    return (
      <>
        <ShoppingCart className="w-5 h-5" />
        {itemCount > 0 && (
          <Badge
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] p-0 flex items-center justify-center text-[10px] bg-accent text-accent-foreground border-2 border-background"
          >
            {itemCount > 99 ? "99+" : itemCount}
          </Badge>
        )}
      </>
    );
  }

  return (
    <Link
      to="/panier"
      className="relative p-2 rounded-full hover:bg-muted transition-colors"
      aria-label={`Panier (${itemCount} articles)`}
    >
      <ShoppingCart className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
      {itemCount > 0 && (
        <Badge
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground border-2 border-background"
        >
          {itemCount > 99 ? "99+" : itemCount}
        </Badge>
      )}
    </Link>
  );
};

export default CartIcon;
