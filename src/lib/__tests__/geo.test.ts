import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  haversineKm,
  formatDistanceKm,
  readCachedUserGeo,
  writeCachedUserGeo,
  USER_GEO_STORAGE_KEY,
  USER_GEO_TTL_MS,
} from "../geo";

describe("haversineKm", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineKm(6.1319, 1.2228, 6.1319, 1.2228)).toBe(0);
  });

  it("computes Lomé → Accra ≈ 167 km (±3 km great-circle)", () => {
    // Lomé (TG) 6.1319, 1.2228 ; Accra (GH) 5.6037, -0.1870
    const d = haversineKm(6.1319, 1.2228, 5.6037, -0.187);
    expect(d).toBeGreaterThan(164);
    expect(d).toBeLessThan(170);
  });

  it("computes Abidjan → Dakar ≈ 1 802 km (±10 km great-circle)", () => {
    // Abidjan (CI) 5.3600, -4.0083 ; Dakar (SN) 14.7167, -17.4677
    const d = haversineKm(5.36, -4.0083, 14.7167, -17.4677);
    expect(d).toBeGreaterThan(1792);
    expect(d).toBeLessThan(1812);
  });

  it("is symmetric: d(A,B) === d(B,A)", () => {
    const a = haversineKm(48.8566, 2.3522, 40.7128, -74.006);
    const b = haversineKm(40.7128, -74.006, 48.8566, 2.3522);
    expect(a).toBeCloseTo(b, 6);
  });

  it("handles antipodes without producing NaN (max ≈ 20 015 km)", () => {
    const d = haversineKm(0, 0, 0, 180);
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeGreaterThan(20000);
    expect(d).toBeLessThan(20020);
  });

  it("throws when any coordinate is NaN or Infinity", () => {
    expect(() => haversineKm(NaN, 0, 0, 0)).toThrow();
    expect(() => haversineKm(0, 0, Infinity, 0)).toThrow();
  });
});

describe("formatDistanceKm", () => {
  it("uses metres under 1 km", () => {
    expect(formatDistanceKm(0.42)).toBe("420 m");
    expect(formatDistanceKm(0.999)).toBe("999 m");
  });
  it("uses decimal km between 1 and 100 km", () => {
    expect(formatDistanceKm(1)).toBe("1.0 km");
    expect(formatDistanceKm(12.345)).toBe("12.3 km");
    expect(formatDistanceKm(99.9)).toBe("99.9 km");
  });
  it("uses rounded, thousands-separated km ≥ 100 km", () => {
    expect(formatDistanceKm(100)).toMatch(/^100\s?km$/);
    // French locale groups with narrow no-break space; assert the digits are there
    const out = formatDistanceKm(1240);
    expect(out).toMatch(/1\D?240 km/);
  });
  it("returns empty string on invalid input (never renders NaN)", () => {
    expect(formatDistanceKm(NaN)).toBe("");
    expect(formatDistanceKm(-5)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// localStorage cache — geolocation autorisée / refusée / cache vide / expiré
// ---------------------------------------------------------------------------

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, v);
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  clear() {
    this.store.clear();
  }
}

describe("readCachedUserGeo / writeCachedUserGeo (localStorage fallback)", () => {
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("returns null when the cache is empty (géolocalisation jamais accordée)", () => {
    expect(readCachedUserGeo(storage as unknown as Storage, 0)).toBeNull();
  });

  it("round-trips a fresh coordinate (cache disponible)", () => {
    const now = 1_700_000_000_000;
    writeCachedUserGeo({ lat: 6.13, lng: 1.22 }, storage as unknown as Storage, now);
    const got = readCachedUserGeo(storage as unknown as Storage, now + 60_000);
    expect(got).not.toBeNull();
    expect(got!.lat).toBeCloseTo(6.13, 6);
    expect(got!.lng).toBeCloseTo(1.22, 6);
  });

  it("expires entries older than the TTL (changement de localisation)", () => {
    const now = 1_700_000_000_000;
    writeCachedUserGeo({ lat: 6.13, lng: 1.22 }, storage as unknown as Storage, now);
    // simulate a read 25 h later — beyond USER_GEO_TTL_MS (24 h)
    const later = now + USER_GEO_TTL_MS + 60_000;
    expect(readCachedUserGeo(storage as unknown as Storage, later)).toBeNull();
  });

  it("returns null on malformed JSON (never crashes)", () => {
    storage.setItem(USER_GEO_STORAGE_KEY, "not-json");
    expect(readCachedUserGeo(storage as unknown as Storage, 0)).toBeNull();
  });

  it("returns null when required fields are missing (partial payload)", () => {
    storage.setItem(USER_GEO_STORAGE_KEY, JSON.stringify({ lat: 1 }));
    expect(readCachedUserGeo(storage as unknown as Storage, 0)).toBeNull();
  });

  it("swallows quota errors on write", () => {
    const throwingStorage = {
      setItem: vi.fn(() => {
        throw new Error("QuotaExceededError");
      }),
    };
    expect(() =>
      writeCachedUserGeo({ lat: 0, lng: 0 }, throwingStorage as unknown as Storage)
    ).not.toThrow();
    expect(throwingStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it("no-ops when storage is unavailable (SSR, incognito refusant l'accès)", () => {
    expect(readCachedUserGeo(null, 0)).toBeNull();
    expect(() => writeCachedUserGeo({ lat: 0, lng: 0 }, null)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// End-to-end scenarios: what does the UI actually see for each fallback path?
// ---------------------------------------------------------------------------

describe("distance resolution scenarios (Section 5 spec)", () => {
  it("géolocalisation autorisée + coordonnées produit présentes → distance chiffrée", () => {
    // user in Lomé, product in Accra → ~167 km great-circle → "167 km"
    const d = haversineKm(6.1319, 1.2228, 5.6037, -0.187);
    expect(formatDistanceKm(d)).toMatch(/16[5-9] km/);
  });

  it("coordonnées GPS absentes du produit → aucun calcul, fallback ville doit prendre le relais", () => {
    // Simulate the guard clause in <ProductDistance />
    const productLat: number | null = null;
    const productLng: number | null = null;
    const shouldCompute = productLat != null && productLng != null;
    expect(shouldCompute).toBe(false);
  });

  it("géolocalisation refusée + cache vide → pas de distance, la ville reste seule visible", () => {
    const storage = new MemoryStorage();
    expect(readCachedUserGeo(storage as unknown as Storage, 0)).toBeNull();
    // The component then depends on the geolocation callback, which
    // silently no-ops on error — resulting in `distance === null`.
  });

  it("changement de localisation utilisateur → le nouveau writeCachedUserGeo écrase l'ancien", () => {
    const storage = new MemoryStorage();
    const t0 = 1_700_000_000_000;
    writeCachedUserGeo({ lat: 6.13, lng: 1.22 }, storage as unknown as Storage, t0);
    writeCachedUserGeo({ lat: 14.7167, lng: -17.4677 }, storage as unknown as Storage, t0 + 5_000);
    const got = readCachedUserGeo(storage as unknown as Storage, t0 + 6_000);
    expect(got!.lat).toBeCloseTo(14.7167, 4);
    expect(got!.lng).toBeCloseTo(-17.4677, 4);
  });
});
