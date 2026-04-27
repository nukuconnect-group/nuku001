import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KycImage } from "./KycImage";

describe("KycImage", () => {
  it("shows 'Non fourni' placeholder when no src is given", () => {
    render(<KycImage src={null} alt="Recto pièce" />);
    expect(screen.getByText("Non fourni")).toBeInTheDocument();
    expect(screen.getByLabelText(/Recto pièce non fourni/i)).toBeInTheDocument();
  });

  it("renders an <img> with the given src and alt", () => {
    render(<KycImage src="https://example.com/kyc.jpg" alt="Selfie KYC" />);
    const img = screen.getByAltText("Selfie KYC") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain("https://example.com/kyc.jpg");
  });

  it("shows broken-image fallback with retry on load error", () => {
    render(<KycImage src="https://broken.example/kyc.jpg" alt="Recto" />);
    const img = screen.getByAltText("Recto") as HTMLImageElement;
    fireEvent.error(img);

    const retryBtn = screen.getByRole("button", { name: /non disponible — réessayer/i });
    expect(retryBtn).toBeInTheDocument();
    expect(screen.getByText(/Image cassée/i)).toBeInTheDocument();
    expect(screen.getByText(/Réessayer/i)).toBeInTheDocument();
  });

  it("retries by re-mounting the image with a cache-busting param", () => {
    render(<KycImage src="https://broken.example/kyc.jpg" alt="Recto" />);
    fireEvent.error(screen.getByAltText("Recto"));
    fireEvent.click(screen.getByRole("button", { name: /réessayer/i }));

    const img = screen.getByAltText("Recto") as HTMLImageElement;
    expect(img.src).toMatch(/[?&]r=1/);
  });
});
