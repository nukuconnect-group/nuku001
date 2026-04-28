import { describe, it, expect } from "vitest";
import { parseLocation, buildDirectionsUrl, formatPresence } from "./location";

describe("parseLocation", () => {
  it("returns fallback when input is empty/null/undefined", () => {
    for (const v of ["", null, undefined, "   "]) {
      const r = parseLocation(v as any);
      expect(r.isFallback).toBe(true);
      expect(r.display).toBe("Localisation à confirmer");
      expect(r.flag).toBe("🇹🇬");
      expect(r.country).toBe("Togo");
    }
  });

  it("parses 'City, Country' correctly", () => {
    const r = parseLocation("Lomé, Togo");
    expect(r.city).toBe("Lomé");
    expect(r.country).toBe("Togo");
    expect(r.flag).toBe("🇹🇬");
    expect(r.display).toBe("Lomé, Togo");
    expect(r.isFallback).toBe(false);
  });

  it("guesses country from known city/string when missing", () => {
    expect(parseLocation("Accra").flag).toBe("🇬🇭");
    expect(parseLocation("Cotonou, Bénin").flag).toBe("🇧🇯");
    expect(parseLocation("Abidjan, Côte d'Ivoire").flag).toBe("🇨🇮");
    expect(parseLocation("Dakar, Sénégal").flag).toBe("🇸🇳");
  });

  it("always provides a display string (no white screen)", () => {
    expect(parseLocation("Kara").display.length).toBeGreaterThan(0);
    expect(parseLocation("").display.length).toBeGreaterThan(0);
  });
});

describe("buildDirectionsUrl", () => {
  it("uses lat/lng destination when available", () => {
    const url = buildDirectionsUrl({ destLat: 6.17, destLng: 1.23 });
    expect(url).toContain("destination=6.17%2C1.23");
  });

  it("falls back to text when coords missing", () => {
    const url = buildDirectionsUrl({ destText: "Lomé, Togo" });
    expect(url).toContain("destination=L");
  });

  it("includes origin when geolocation provided", () => {
    const url = buildDirectionsUrl({
      destLat: 6.17, destLng: 1.23,
      originLat: 5.6, originLng: -0.18,
    });
    expect(url).toContain("origin=5.6%2C-0.18");
  });
});

describe("formatPresence", () => {
  it("returns offline when no timestamp", () => {
    expect(formatPresence(null).isOnline).toBe(false);
  });
  it("returns online for recent activity (<5 min)", () => {
    const d = new Date(Date.now() - 60 * 1000);
    expect(formatPresence(d).isOnline).toBe(true);
  });
  it("returns 'Vu il y a' for older activity", () => {
    const d = new Date(Date.now() - 30 * 60 * 1000);
    expect(formatPresence(d).label).toMatch(/Vu il y a/);
  });
});
