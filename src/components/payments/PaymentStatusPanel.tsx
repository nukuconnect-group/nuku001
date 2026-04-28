import { Loader2, CheckCircle2, AlertTriangle, Clock, XCircle, RefreshCw, LifeBuoy, ShoppingCart } from "lucide-react";
import {
  PaymentStatus,
  PaymentStatusKind,
  PAYMENT_STATUS_TITLES,
  formatFcfa,
} from "@/lib/paymentStatus";

interface PaymentStatusPanelProps {
  status: PaymentStatus;
  /** Compact = formation card variant; default = cart full-width */
  variant?: "default" | "compact";
  /** Show "Vérifier maintenant" button (calls Paygate status again) */
  onVerifyNow?: () => void;
  isVerifying?: boolean;
  /** Show "Contacter le support" CTA (used for debited_pending_finalization / unknown) */
  onContactSupport?: () => void;
  isContactingSupport?: boolean;
  /** Reset to idle so the user can start a fresh payment attempt */
  onRetry?: () => void;
}

const ICON_FOR_KIND: Record<PaymentStatusKind, any> = {
  idle: ShoppingCart,
  initiating: Loader2,
  pending: Loader2,
  success: CheckCircle2,
  failed: XCircle,
  expired: Clock,
  unknown: AlertTriangle,
  debited_pending_finalization: AlertTriangle,
};

function panelClasses(kind: PaymentStatusKind, variant: "default" | "compact"): string {
  const base = variant === "compact"
    ? "rounded-md border p-2.5 text-[11px] sm:text-xs flex items-start gap-2"
    : "rounded-lg border p-3 sm:p-4 text-xs sm:text-sm flex items-start gap-3";
  switch (kind) {
    case "success":
      return `${base} border-primary/40 bg-primary/10`;
    case "failed":
      return `${base} border-destructive/40 bg-destructive/10 text-destructive`;
    case "expired":
      return `${base} border-destructive/30 bg-destructive/5 text-destructive`;
    case "pending":
    case "initiating":
      return `${base} border-accent/40 bg-accent/10`;
    case "debited_pending_finalization":
    case "unknown":
      return `${base} border-yellow-500/40 bg-yellow-500/10`;
    default:
      return `${base} border-border bg-muted`;
  }
}

function iconColor(kind: PaymentStatusKind): string {
  if (kind === "success") return "text-primary";
  if (kind === "failed" || kind === "expired") return "";
  if (kind === "debited_pending_finalization" || kind === "unknown") return "text-yellow-700 dark:text-yellow-400";
  return "";
}

export function PaymentStatusPanel({
  status,
  variant = "default",
  onVerifyNow,
  isVerifying,
  onContactSupport,
  isContactingSupport,
  onRetry,
}: PaymentStatusPanelProps) {
  if (status.kind === "idle") return null;

  const Icon = ICON_FOR_KIND[status.kind];
  const isSpinning = status.kind === "initiating" || status.kind === "pending";
  const message = "message" in status ? status.message : "";
  const details = ("details" in status ? status.details : undefined) || undefined;

  // Show verify-now for pending / unknown / debited_pending states
  const canVerify =
    !!onVerifyNow &&
    (status.kind === "pending" ||
      status.kind === "unknown" ||
      status.kind === "debited_pending_finalization");
  // Show support for unknown / debited mismatch
  const canContactSupport =
    !!onContactSupport &&
    (status.kind === "unknown" || status.kind === "debited_pending_finalization");
  // Show retry button for terminal failed/expired
  const canRetry = !!onRetry && (status.kind === "failed" || status.kind === "expired");

  const iconSize = variant === "compact" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <div role="status" aria-live="polite" className={panelClasses(status.kind, variant)}>
      <Icon
        className={`${iconSize} flex-shrink-0 mt-0.5 ${isSpinning ? "animate-spin" : ""} ${iconColor(status.kind)}`}
      />
      <div className="flex-1 min-w-0">
        <p className={variant === "compact" ? "font-semibold mb-0.5" : "font-semibold mb-1"}>
          {PAYMENT_STATUS_TITLES[status.kind]}
        </p>
        {message && <p className="opacity-90 leading-relaxed break-words">{message}</p>}

        {details && (status.kind === "success" || status.kind === "debited_pending_finalization") && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] sm:text-xs bg-background/60 rounded-md p-2 border border-primary/10">
            {details.invoiceNumber && (
              <div>
                <span className="text-muted-foreground">Facture :</span>{" "}
                <span className="font-medium">{details.invoiceNumber}</span>
              </div>
            )}
            {details.amount != null && (
              <div>
                <span className="text-muted-foreground">Montant :</span>{" "}
                <span className="font-medium">{formatFcfa(details.amount)}</span>
              </div>
            )}
            {details.method && (
              <div>
                <span className="text-muted-foreground">Mode :</span>{" "}
                <span className="font-medium">{details.method}</span>
              </div>
            )}
            {details.formationTitle && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Formation :</span>{" "}
                <span className="font-medium">{details.formationTitle}</span>
              </div>
            )}
            {details.orderIds && details.orderIds.length > 0 && (
              <div>
                <span className="text-muted-foreground">Commandes :</span>{" "}
                <span className="font-medium">{details.orderIds.length}</span>
              </div>
            )}
            {details.txReference && (
              <div className="sm:col-span-2 truncate">
                <span className="text-muted-foreground">Réf. transaction :</span>{" "}
                <span className="font-mono text-foreground">{details.txReference}</span>
              </div>
            )}
          </div>
        )}

        {(canVerify || canContactSupport || canRetry) && (
          <div className="mt-2 flex flex-wrap gap-3 items-center">
            {canVerify && (
              <button
                type="button"
                onClick={onVerifyNow}
                disabled={isVerifying}
                className="inline-flex items-center gap-1 underline font-medium disabled:opacity-60"
              >
                {isVerifying ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Vérifier maintenant
              </button>
            )}
            {canContactSupport && (
              <button
                type="button"
                onClick={onContactSupport}
                disabled={isContactingSupport}
                className="inline-flex items-center gap-1 underline font-medium disabled:opacity-60"
              >
                {isContactingSupport ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <LifeBuoy className="w-3 h-3" />
                )}
                Contacter le support
              </button>
            )}
            {canRetry && (
              <button type="button" onClick={onRetry} className="underline font-medium">
                Réessayer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
