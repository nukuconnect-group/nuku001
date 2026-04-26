import { Button } from "@/components/ui/button";
import { MessageCircleQuestion } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  /** Contexte (jetons, abonnement, api, analytics...) — utilisé pour pré-remplir la question */
  context: "tokens" | "subscription" | "api" | "analytics" | "general";
  /** Question pré-remplie. Si non fourni, un message par défaut est généré selon le contexte. */
  prefill?: string;
  variant?: "outline" | "ghost" | "hero";
  size?: "sm" | "default";
  className?: string;
  label?: string;
}

const DEFAULTS: Record<Props["context"], string> = {
  tokens: "Bonjour, j'ai une question sur mes jetons (solde, recharge, expiration). Pouvez-vous m'aider ?",
  subscription: "Bonjour, j'ai une question sur mon abonnement (plan, renouvellement, avantages). Pouvez-vous m'aider ?",
  api: "Bonjour, j'ai une question concernant l'API NukuConnect (clé, intégration, codes erreur). Pouvez-vous m'aider ?",
  analytics: "Bonjour, j'aimerais comprendre mes statistiques et comment les améliorer. Pouvez-vous m'aider ?",
  general: "Bonjour, j'ai une question.",
};

export default function AskAdvisorButton({
  context,
  prefill,
  variant = "outline",
  size = "sm",
  className = "",
  label = "Demander au Conseiller",
}: Props) {
  const navigate = useNavigate();
  const message = prefill || DEFAULTS[context];

  const handleClick = () => {
    // Stocke la question pour pré-remplissage côté PremiumDashboard
    sessionStorage.setItem("nuku_advisor_prefill", message);
    sessionStorage.setItem("nuku_advisor_context", context);
    navigate("/premium?tab=manager");
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      className={`gap-1.5 ${className}`}
      title={message}
    >
      <MessageCircleQuestion className="w-3.5 h-3.5" />
      {label}
    </Button>
  );
}
