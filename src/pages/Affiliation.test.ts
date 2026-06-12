import { describe, it, expect } from "vitest";
import { COMMISSION_RATES, buildReferralLink } from "./Affiliation";

describe("Affiliation — non-regression Passe 3", () => {
  it("garantit les taux de commission 10% abonnement / 2% achat", () => {
    expect(COMMISSION_RATES.subscription).toBeCloseTo(0.10, 5);
    expect(COMMISSION_RATES.purchase).toBeCloseTo(0.02, 5);
  });

  it("construit un lien de parrainage avec ?ref=CODE encodé", () => {
    expect(buildReferralLink("https://www.nukuconnect.com", "NUKU123"))
      .toBe("https://www.nukuconnect.com/auth?ref=NUKU123");
  });

  it("encode les caractères spéciaux dans le code de parrainage", () => {
    const link = buildReferralLink("https://x.test", "AB CD&EF");
    expect(link).toContain("ref=AB%20CD%26EF");
  });
});
