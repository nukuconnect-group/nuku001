import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LocationBadge from "./LocationBadge";

describe("LocationBadge — non-regression", () => {
  it("renders a badge even when location is missing (fallback)", () => {
    render(<LocationBadge location={undefined} />);
    const el = screen.getByTestId("location-badge");
    expect(el).toBeInTheDocument();
    expect(el.textContent).toMatch(/Localisation/);
  });

  it("renders a badge for empty string", () => {
    render(<LocationBadge location="" />);
    expect(screen.getByTestId("location-badge")).toBeInTheDocument();
  });

  it("displays city and country when both present", () => {
    render(<LocationBadge location="Lomé, Togo" />);
    const el = screen.getByTestId("location-badge");
    expect(el.textContent).toContain("Lomé");
    expect(el.textContent).toContain("Togo");
  });

  it("renders a flag emoji always", () => {
    const { rerender } = render(<LocationBadge location="" />);
    expect(screen.getByTestId("location-badge").textContent).toMatch(/🇹🇬|🇬🇭|🇧🇯|🇨🇮|🇸🇳/);
    rerender(<LocationBadge location="Accra, Ghana" />);
    expect(screen.getByTestId("location-badge").textContent).toContain("🇬🇭");
  });

  it("supports both sm and md sizes (responsive)", () => {
    const { rerender } = render(<LocationBadge location="Kara, Togo" size="sm" />);
    expect(screen.getByTestId("location-badge")).toBeInTheDocument();
    rerender(<LocationBadge location="Kara, Togo" size="md" />);
    expect(screen.getByTestId("location-badge")).toBeInTheDocument();
  });
});
