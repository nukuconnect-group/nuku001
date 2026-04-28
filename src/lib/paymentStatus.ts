/**
 * Shared payment status model used across FormationDetail and Cart.
 * Single source of truth for kinds, labels and details so messages stay
 * consistent everywhere a Paygate transaction is observed.
 */

export type PaymentStatusKind =
  | "idle"
  | "initiating"
  | "pending"
  | "success"
  | "failed"
  | "expired"
  | "unknown"
  | "debited_pending_finalization";

export interface PaymentStatusDetails {
  invoiceNumber?: string;
  amount?: number;
  method?: string;
  /** Order or formation references attached to this payment */
  orderIds?: string[];
  formationTitle?: string;
  /** Paygate technical references */
  identifier?: string;
  txReference?: string;
}

export type PaymentStatus =
  | { kind: "idle" }
  | { kind: "initiating"; message?: string }
  | { kind: "pending"; message: string; details?: PaymentStatusDetails }
  | { kind: "success"; message: string; details?: PaymentStatusDetails }
  | { kind: "failed"; message: string; details?: PaymentStatusDetails }
  | { kind: "expired"; message: string; details?: PaymentStatusDetails }
  | { kind: "unknown"; message: string; details?: PaymentStatusDetails }
  | { kind: "debited_pending_finalization"; message: string; details?: PaymentStatusDetails };

export const PAYMENT_STATUS_TITLES: Record<PaymentStatusKind, string> = {
  idle: "",
  initiating: "Initialisation du paiement…",
  pending: "Paiement en attente de confirmation",
  success: "✅ Paiement confirmé",
  failed: "❌ Paiement échoué",
  expired: "⏰ Session de paiement expirée",
  unknown: "Statut de paiement inconnu",
  debited_pending_finalization:
    "⚠️ Montant débité — finalisation en attente",
};

export const PAYMENT_STATUS_DEFAULT_MESSAGES: Record<PaymentStatusKind, string> = {
  idle: "",
  initiating: "Préparation de la transaction sécurisée…",
  pending:
    "Validez la demande sur votre téléphone Mobile Money ou complétez le paiement par carte. Nous vérifions le statut automatiquement.",
  success:
    "Le montant a été débité avec succès et votre commande est confirmée.",
  failed:
    "La transaction n'a pas abouti — aucun montant n'a été débité. Vous pouvez relancer le paiement.",
  expired:
    "La session de paiement a expiré sans confirmation. Relancez le paiement pour réessayer.",
  unknown:
    "Le statut du paiement n'a pas pu être confirmé. Si le montant a été débité, le service va se synchroniser sous peu — vous pouvez vérifier maintenant.",
  debited_pending_finalization:
    "Paygate confirme le débit, mais la finalisation côté NukuConnect est encore en cours. Aucun nouveau prélèvement ne sera effectué — vous pouvez vérifier maintenant ou contacter le support.",
};

/** Normalize a raw response from `enroll-paid-formation` / Paygate status to a status kind. */
export function mapBackendStateToKind(state?: string | null): PaymentStatusKind {
  switch ((state || "").toLowerCase()) {
    case "success":
    case "completed":
    case "enrolled":
    case "already_enrolled":
      return "success";
    case "pending":
      return "pending";
    case "expired":
      return "expired";
    case "failed":
    case "cancelled":
      return "failed";
    case "debited_pending_finalization":
      return "debited_pending_finalization";
    case "unknown":
      return "unknown";
    default:
      return "unknown";
  }
}

export function formatFcfa(amount?: number): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return `${amount.toLocaleString("en-US")} FCFA`;
}
