import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Product } from "@/data/marketplace";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const getCartStorageKey = (userId?: string | null) =>
  userId ? `nukuconnect-cart:${userId}` : "nukuconnect-cart:guest";

const readStoredCart = (storageKey: string): CartItem[] => {
  try {
    const saved = localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user, isReady } = useProfile();
  const [items, setItems] = useState<CartItem[]>([]);
  const [activeStorageKey, setActiveStorageKey] = useState<string | null>(null);
  const cartStorageKey = useMemo(() => getCartStorageKey(user?.id), [user?.id]);

  useEffect(() => {
    if (!isReady) return;

    const storedItems = readStoredCart(cartStorageKey);
    if (user?.id) {
      const guestKey = getCartStorageKey(null);
      const guestItems = readStoredCart(guestKey);
      if (guestItems.length > 0) {
        const merged = [...storedItems];
        for (const guestItem of guestItems) {
          const existing = merged.find((item) => item.product.id === guestItem.product.id);
          if (existing) existing.quantity += guestItem.quantity;
          else merged.push(guestItem);
        }
        try {
          localStorage.setItem(cartStorageKey, JSON.stringify(merged));
          localStorage.removeItem(guestKey);
        } catch {
          // Ignore storage write failures silently
        }
        setItems(merged);
        setActiveStorageKey(cartStorageKey);
        return;
      }
    }

    setItems(storedItems);
    setActiveStorageKey(cartStorageKey);
  }, [isReady, cartStorageKey, user?.id]);

  // Auto-remove items already paid/confirmed by the user; remind for pending unpaid items
  const reminderShownRef = useRef(false);
  useEffect(() => {
    if (!isReady || !user?.id || items.length === 0) return;
    let cancelled = false;
    (async () => {
      const ids = items.map((i) => i.product.id);
      // Get the buyer profile id
      const { data: prof } = await supabase
        .from("profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!prof?.id || cancelled) return;
      const { data: paidOrders } = await supabase
        .from("orders")
        .select("product_id,status")
        .eq("buyer_id", prof.id)
        .in("product_id", ids)
        .in("status", ["paid", "confirmed", "completed", "delivered", "shipped", "processing"]);
      if (cancelled) return;
      const paidIds = new Set((paidOrders || []).map((o: any) => o.product_id));
      if (paidIds.size > 0) {
        setItems((prev) => prev.filter((i) => !paidIds.has(i.product.id)));
        toast.success("Panier mis à jour", { description: "Les produits déjà payés ont été retirés." });
      }
      // Pending purchase reminder — items still in cart, never ordered
      if (!reminderShownRef.current) {
        reminderShownRef.current = true;
        const pending = items.filter((i) => !paidIds.has(i.product.id));
        if (pending.length > 0) {
          toast(`🛒 ${pending.length} produit${pending.length > 1 ? "s" : ""} en attente d'achat`, {
            description: "Finalisez votre commande avant rupture de stock.",
            duration: 6000,
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [isReady, user?.id, items.length]);

  useEffect(() => {
    if (!isReady || !activeStorageKey) return;

    try {
      localStorage.setItem(activeStorageKey, JSON.stringify(items));
    } catch {
      // Ignore storage write failures silently
    }
  }, [items, isReady, activeStorageKey]);


  const addItem = (product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item,
      ),
    );
  };

  const clearCart = () => {
    setItems([]);

    if (!activeStorageKey) return;

    try {
      localStorage.removeItem(activeStorageKey);
    } catch {
      // Ignore storage write failures silently
    }
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};