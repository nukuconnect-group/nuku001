import { describe, it, expect } from "vitest";
import {
  isTrackingParam,
  stripTrackingFromUrl,
  listTrackingParams,
  buildCanonicalPath,
} from "./trackingParams";

describe("trackingParams", () => {
  describe("isTrackingParam", () => {
    it("flags known ad params", () => {
      expect(isTrackingParam("srsltid")).toBe(true);
      expect(isTrackingParam("gclid")).toBe(true);
      expect(isTrackingParam("fbclid")).toBe(true);
      expect(isTrackingParam("msclkid")).toBe(true);
      expect(isTrackingParam("aff")).toBe(true);
    });
    it("flags ALL utm_* variants", () => {
      expect(isTrackingParam("utm_source")).toBe(true);
      expect(isTrackingParam("utm_medium")).toBe(true);
      expect(isTrackingParam("utm_campaign")).toBe(true);
      expect(isTrackingParam("utm_random_thing")).toBe(true);
    });
    it("PRESERVES the affiliation `ref` param", () => {
      expect(isTrackingParam("ref")).toBe(false);
    });
    it("does not flag legitimate params", () => {
      expect(isTrackingParam("q")).toBe(false);
      expect(isTrackingParam("category")).toBe(false);
      expect(isTrackingParam("page")).toBe(false);
    });
  });

  describe("stripTrackingFromUrl", () => {
    it("removes srsltid from the home page", () => {
      expect(stripTrackingFromUrl("https://nukuconnect.com/?srsltid=TEST123")).toBe("/");
    });
    it("removes utm_* and keeps real params", () => {
      const out = stripTrackingFromUrl(
        "https://nukuconnect.com/marketplace?utm_source=google&utm_campaign=x&category=fruits"
      );
      expect(out).toBe("/marketplace?category=fruits");
    });
    it("preserves the affiliation ref", () => {
      const out = stripTrackingFromUrl("https://nukuconnect.com/auth?ref=ABC123&gclid=zzz");
      expect(out).toBe("/auth?ref=ABC123");
    });
    it("keeps the hash fragment", () => {
      const out = stripTrackingFromUrl("https://nukuconnect.com/blog?fbclid=zz#section-2");
      expect(out).toBe("/blog#section-2");
    });
  });

  describe("listTrackingParams", () => {
    it("returns the list of dirty params for admin debugging", () => {
      const found = listTrackingParams(
        "https://nukuconnect.com/?srsltid=A&utm_source=B&category=fruits"
      );
      expect(found.sort()).toEqual(["srsltid", "utm_source"]);
    });
  });

  describe("buildCanonicalPath", () => {
    it("drops ALL query and hash", () => {
      expect(
        buildCanonicalPath("https://nukuconnect.com/?srsltid=X&utm_source=Y#hero")
      ).toBe("/");
      expect(
        buildCanonicalPath("https://nukuconnect.com/marketplace?ref=ABC&gclid=zz")
      ).toBe("/marketplace");
    });
  });
});
