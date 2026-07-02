import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LanguageProvider, useLanguage } from "./LanguageContext";

const Probe = () => {
  const { lang, setLang } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <button onClick={() => setLang("en")}>to-en</button>
      <button onClick={() => setLang("fr")}>to-fr</button>
    </div>
  );
};

const setNavigatorLanguages = (langs: string[]) => {
  Object.defineProperty(window.navigator, "languages", { value: langs, configurable: true });
  Object.defineProperty(window.navigator, "language", { value: langs[0], configurable: true });
};

describe("LanguageContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => vi.restoreAllMocks());

  it("auto-detects English from navigator when no stored preference", () => {
    setNavigatorLanguages(["en-US", "en"]);
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByTestId("lang").textContent).toBe("en");
  });

  it("auto-detects French from navigator when no stored preference", () => {
    setNavigatorLanguages(["fr-FR", "fr"]);
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByTestId("lang").textContent).toBe("fr");
  });

  it("manual selection overrides browser detection and persists to localStorage", () => {
    setNavigatorLanguages(["fr-FR"]);
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByTestId("lang").textContent).toBe("fr");
    act(() => { screen.getByText("to-en").click(); });
    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(localStorage.getItem("nukuconnect-lang")).toBe("en");
  });

  it("restores persisted language after remount (simulated restart)", () => {
    localStorage.setItem("nukuconnect-lang", "en");
    setNavigatorLanguages(["fr-FR"]); // browser says FR but stored EN must win
    const { unmount } = render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByTestId("lang").textContent).toBe("en");
    unmount();
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByTestId("lang").textContent).toBe("en");
  });
});
