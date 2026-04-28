import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProductCard from "./ProductCard";
import type { Product } from "@/data/marketplace";

// Mock auth-dependent hooks
vi.mock("@/components/cart/CartContext", () => ({
  useCart: () => ({ addItem: vi.fn() }),
}));
vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ formatPrice: (n: number) => `${n} F` }),
}));
vi.mock("@/hooks/useWishlist", () => ({
  useWishlist: () => ({ isInWishlist: () => false, toggleWishlist: vi.fn(), isAuthenticated: false }),
}));
vi.mock("@/hooks/useProductPriceTiers", () => ({
  useProductPriceTiers: () => ({ data: [] }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ ilike: () => Promise.resolve({ count: 0 }) }) }) }) },
}));

const baseProduct: Product = {
  id: "prod-test-1",
  name: "Tomate fraîche",
  category: "legumes",
  price: 1000,
  unit: "kg",
  quantity: 100,
  location: "Lomé",
  description: "",
  isOrganic: false,
  image: "",
  images: [],
  createdAt: new Date().toISOString(),
  producer: { id: "p1", name: "ProducerX", avatar: "", rating: 4.5, verified: false, bio: "", phone: "" },
} as Product;

const renderCard = (props: Parameters<typeof ProductCard>[0]) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProductCard {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("ProductCard — sponsored discount badge", () => {
  it("always shows -X% badge for sponsored (boosted) products", () => {
    renderCard({ product: baseProduct, isBoosted: true, minimal: true });
    const badges = screen.getAllByText(/^-\d+%$/);
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the discount badge exactly once (no duplicate)", () => {
    renderCard({ product: baseProduct, isBoosted: true, minimal: true });
    const badges = screen.getAllByText(/^-\d+%$/);
    expect(badges).toHaveLength(1);
  });

  it("hides unit, shipping and reviews in minimal mode", () => {
    renderCard({ product: baseProduct, isBoosted: true, minimal: true });
    expect(screen.queryByText(/\/kg/)).toBeNull();
    expect(screen.queryByText(/Min\. 1/)).toBeNull();
    expect(screen.queryByText(/vendus/)).toBeNull();
    expect(screen.queryByText("ProducerX")).toBeNull();
    expect(screen.queryByText("VENTE")).toBeNull();
  });

  it("places the discount badge in the top area, not in the footer/content", () => {
    const { container } = renderCard({ product: baseProduct, isBoosted: true, minimal: true });
    const badge = screen.getByText(/^-\d+%$/);
    // The badge must be inside the absolutely-positioned top-right wrapper, not in CardContent
    const cardContent = container.querySelector('[class*="p-2"]');
    expect(cardContent?.contains(badge)).toBe(false);
  });
});
