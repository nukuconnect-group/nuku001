import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Check } from "lucide-react";

const languages = [
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ewe", name: "Eʋegbe", flag: "🇹🇬" },
  { code: "kab", name: "Kabɩyɛ", flag: "🇹🇬" },
  { code: "wo", name: "Wolof", flag: "🇸🇳" },
];

interface LanguageSwitcherProps {
  variant?: "icon" | "full";
}

const LanguageSwitcher = ({ variant = "icon" }: LanguageSwitcherProps) => {
  const [currentLang, setCurrentLang] = useState("fr");

  const currentLanguage = languages.find(l => l.code === currentLang);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={variant === "icon" ? "icon" : "sm"} className="gap-2">
          <Globe className="w-4 h-4" />
          {variant === "full" && (
            <span className="hidden sm:inline">{currentLanguage?.flag} {currentLanguage?.name}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setCurrentLang(lang.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </span>
            {currentLang === lang.code && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
