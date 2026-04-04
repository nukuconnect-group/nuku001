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

  // Use refs for callbacks to avoid stale closures
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

  const checkStatus = useCallback(async (): Promise<boolean> => {
    if (!identifier && !tx_reference) return false;
    if (stoppedRef.current) return true;

    try {
      const { data, error } = await supabase.functions.invoke("paygate-status", {
        body: { identifier, tx_reference },
      });

      if (error) {
        console.error("Paygate status check error:", error);
        return false;
      }

      setPaymentData(data);
      const newStatus = data?.status as PaymentStatus || "unknown";
      setStatus(newStatus);

      console.log(`[Paygate] Status check: ${newStatus}`, data);

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
      return false;
    } catch (e) {
      console.error("Paygate polling error:", e);
      return false;
    }
  }, [identifier, tx_reference, stopPolling]);

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
      const shouldStop = await checkStatus();
      if (shouldStop || count >= maxAttempts) {
        stopPolling();
        if (count >= maxAttempts && !shouldStop) {
          setStatus("expired");
          onExpiredRef.current?.();
        }
      }
    };

    // First check after 3s (give mobile money time to process)
    const initialTimeout = setTimeout(() => {
      poll();
      // Then continue polling at regular interval
      if (!stoppedRef.current) {
        intervalRef.current = setInterval(poll, intervalMs);
      }
    }, 3000);

    return () => {
      clearTimeout(initialTimeout);
      stopPolling();
    };
  }, [enabled, identifier, tx_reference, intervalMs, maxAttempts, checkStatus, stopPolling]);

  const reset = () => {
    setStatus("idle");
    setAttempts(0);
    setPaymentData(null);
    stopPolling();
    stoppedRef.current = false;
  };

  return { status, attempts, paymentData, reset };
}
