import { describe, it, expect } from "vitest";
import { sellerPlans } from "./BecomeSeller";

describe("BecomeSeller — non-regression Passe 3", () => {
  it("expose exactement les 3 packs vendeur (free / pro / business)", () => {
    expect(sellerPlans).toHaveLength(3);
    expect(sellerPlans.map((p) => p.id)).toEqual(["free", "pro", "business"]);
  });

  it("respecte les limites de produits par pack", () => {
    const byId = Object.fromEntries(sellerPlans.map((p) => [p.id, p]));
    expect(byId.free.maxProducts).toBe(3);
    expect(byId.pro.maxProducts).toBe(15);
    expect(byId.business.maxProducts).toBeGreaterThanOrEqual(9999);
  });

  it("chaque pack a un nom, prix, badge et au moins une feature", () => {
    for (const p of sellerPlans) {
      expect(p.name).toBeTruthy();
      expect(p.price).toMatch(/FCFA/);
      expect(p.badge).toBeTruthy();
      expect(p.features.length).toBeGreaterThan(0);
    }
  });
});
