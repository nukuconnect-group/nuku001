import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type PaymentStatus = "idle" | "pending" | "completed" | "failed" | "expired" | "unknown";

interface UsePaygatePollingOptions {
  identifier?: string;
  tx_reference?: string;
  enabled?: boolean;
  intervalMs?: number;
  maxAttempts?: number;
  onCompleted?: (data: any) => void;
  onFailed?: (data: any) => void;
  onExpired?: () => void;
}

export function usePaygatePolling({
  identifier,
  tx_reference,
  enabled = false,
  intervalMs = 5000,
  maxAttempts = 60,
  onCompleted,
  onFailed,
  onExpired,
}: UsePaygatePollingOptions) {
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [attempts, setAttempts] = useState(0);
  const [paymentData, setPaymentData] = useState<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  const onCompletedRef = useRef(onCompleted);
  const onFailedRef = useRef(onFailed);
  const onExpiredRef = useRef(onExpired);
  onCompletedRef.current = onCompleted;
  onFailedRef.current = onFailed;
  onExpiredRef.current = onExpired;

  const stopPolling = useCallback(() => {
    stoppedRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Check if the order was already confirmed by webhook (fallback)
  const checkOrderConfirmedByWebhook = useCallback(async (): Promise<boolean> => {
    if (!identifier) return false;
    try {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, status")
        .or(`notes.ilike.%${identifier}%`)
        .eq("status", "confirmed")
        .limit(1);
      return !!(orders && orders.length > 0);
    } catch {
      return false;
    }
  }, [identifier]);

  const checkStatus = useCallback(async (attemptCount: number): Promise<boolean> => {
    if (!identifier && !tx_reference) return false;
    if (stoppedRef.current) return true;

    try {
      const { data, error } = await supabase.functions.invoke("paygate-status", {
        body: { identifier, tx_reference },
      });

      if (error) {
        console.error("Paygate status check error:", error);
        // On error, try webhook fallback after a few attempts
        if (attemptCount >= 3) {
          const confirmedByWebhook = await checkOrderConfirmedByWebhook();
          if (confirmedByWebhook) {
            console.log("[Paygate] Order confirmed by webhook fallback");
            stopPolling();
            onCompletedRef.current?.({ status: "completed", source: "webhook_fallback" });
            return true;
          }
        }
        return false;
      }

      setPaymentData(data);
      const newStatus = data?.status as PaymentStatus || "unknown";
      setStatus(newStatus);

      console.log(`[Paygate] Status check #${attemptCount}: ${newStatus}`, data);

      if (newStatus === "completed") {
        stopPolling();
        onCompletedRef.current?.(data);
        return true;
      }
      if (newStatus === "failed") {
        stopPolling();
        onFailedRef.current?.(data);
        return true;
      }
      if (newStatus === "expired") {
        stopPolling();
        onExpiredRef.current?.();
        return true;
      }

      // For "pending" or "unknown" status, check if webhook already confirmed the order
      // This handles the case where mobile money debits but Paygate API doesn't update
      if (attemptCount >= 4 && attemptCount % 3 === 0) {
        const confirmedByWebhook = await checkOrderConfirmedByWebhook();
        if (confirmedByWebhook) {
          console.log("[Paygate] Order confirmed by webhook while polling showed:", newStatus);
          setStatus("completed");
          stopPolling();
          onCompletedRef.current?.({ ...data, status: "completed", source: "webhook_confirmed" });
          return true;
        }
      }

      return false;
    } catch (e) {
      console.error("Paygate polling error:", e);
      return false;
    }
  }, [identifier, tx_reference, stopPolling, checkOrderConfirmedByWebhook]);

  useEffect(() => {
    if (!enabled || (!identifier && !tx_reference)) {
      setStatus("idle");
      return;
    }

    stoppedRef.current = false;
    setStatus("pending");
    setAttempts(0);
    let count = 0;

    const poll = async () => {
      if (stoppedRef.current) return;
      count++;
      setAttempts(count);
      const shouldStop = await checkStatus(count);
      if (shouldStop || count >= maxAttempts) {
        stopPolling();
        if (count >= maxAttempts && !shouldStop) {
          // Last chance: check webhook confirmation before declaring expired
          const confirmedByWebhook = await checkOrderConfirmedByWebhook();
          if (confirmedByWebhook) {
            setStatus("completed");
            onCompletedRef.current?.({ status: "completed", source: "webhook_final_check" });
          } else {
            setStatus("expired");
            onExpiredRef.current?.();
          }
        }
      }
    };

    // First check after 3s
    const initialTimeout = setTimeout(() => {
      poll();
      if (!stoppedRef.current) {
        intervalRef.current = setInterval(poll, intervalMs);
      }
    }, 3000);

    return () => {
      clearTimeout(initialTimeout);
      stopPolling();
    };
  }, [enabled, identifier, tx_reference, intervalMs, maxAttempts, checkStatus, stopPolling, checkOrderConfirmedByWebhook]);

  const reset = () => {
    setStatus("idle");
    setAttempts(0);
    setPaymentData(null);
    stopPolling();
    stoppedRef.current = false;
  };

  return { status, attempts, paymentData, reset };
}
