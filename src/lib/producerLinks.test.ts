import { describe, it, expect } from "vitest";
import { producerShopUrl } from "./producerLinks";
import { withRef, shareTargets, absoluteUrl } from "./shareLinks";

describe("ProducerProfile — non-regression Passe 3", () => {
  it("génère l'URL canonique d'une boutique producteur", () => {
    expect(producerShopUrl("Ferme du Mono")).toBe("/producteurs/Ferme%20du%20Mono");
  });

  it("tombe sur Fournisseur générique si le nom est vide", () => {
    expect(producerShopUrl(null)).toBe("/producteurs/Fournisseur");
    expect(producerShopUrl("")).toBe("/producteurs/Fournisseur");
  });

  it("ajoute le code de parrainage à un lien existant sans casser les params", () => {
    expect(withRef("https://x.test/page", "NUKU1")).toBe("https://x.test/page?ref=NUKU1");
    expect(withRef("https://x.test/page?a=1", "NUKU2")).toBe("https://x.test/page?a=1&ref=NUKU2");
    expect(withRef("https://x.test/page", null)).toBe("https://x.test/page");
  });

  it("génère les cibles de partage WhatsApp / Facebook / X / LinkedIn / Telegram / Email", () => {
    const t = shareTargets("https://x.test/p", "Texte");
    expect(t.whatsapp).toContain("wa.me");
    expect(t.facebook).toContain("facebook.com");
    expect(t.twitter).toContain("twitter.com");
    expect(t.linkedin).toContain("linkedin.com");
    expect(t.telegram).toContain("t.me");
    expect(t.email.startsWith("mailto:")).toBe(true);
  });

  it("absoluteUrl préserve les URL absolues et préfixe les chemins relatifs", () => {
    expect(absoluteUrl("https://x.test/a")).toBe("https://x.test/a");
    expect(absoluteUrl("/produit/42")).toBe("https://www.nukuconnect.com/produit/42");
    expect(absoluteUrl("produit/42")).toBe("https://www.nukuconnect.com/produit/42");
  });
});
