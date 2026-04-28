import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CleanTrackingParams from "./CleanTrackingParams";
import { buildCanonicalPath } from "@/lib/trackingParams";

// jsdom integration test simulating the user landing on /?srsltid=TEST123
// from a Google Shopping result. The component must:
//  1. Replace the URL with `/` immediately (no reload)
//  2. NOT change the canonical path computation (still `/`)

describe("CleanTrackingParams", () => {
  beforeEach(() => {
    // Reset jsdom URL before each test
    window.history.replaceState({}, "", "/");
  });

  it("strips ?srsltid=TEST123 from the URL bar without reloading", () => {
    window.history.replaceState({}, "", "/?srsltid=TEST123");
    expect(window.location.search).toBe("?srsltid=TEST123");

    render(
      <MemoryRouter initialEntries={["/?srsltid=TEST123"]}>
        <CleanTrackingParams />
      </MemoryRouter>
    );

    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("");
  });

  it("canonical path is invariant whether the URL has tracking params or not", () => {
    const dirty = "https://nukuconnect.com/?srsltid=TEST123&utm_source=google";
    const clean = "https://nukuconnect.com/";
    expect(buildCanonicalPath(dirty)).toBe(buildCanonicalPath(clean));
    expect(buildCanonicalPath(dirty)).toBe("/");
  });

  it("strips utm_* + msutm + aff but preserves the affiliation ref", () => {
    window.history.replaceState({}, "", "/auth?ref=AFFCODE&utm_source=email&aff=zz");

    render(
      <MemoryRouter initialEntries={["/auth?ref=AFFCODE&utm_source=email&aff=zz"]}>
        <CleanTrackingParams />
      </MemoryRouter>
    );

    expect(window.location.pathname).toBe("/auth");
    expect(window.location.search).toBe("?ref=AFFCODE");
  });
});
