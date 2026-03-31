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

  const checkStatus = useCallback(async () => {
    if (!identifier && !tx_reference) return;

    try {
      const { data, error } = await supabase.functions.invoke("paygate-status", {
        body: { identifier, tx_reference },
      });

      if (error) {
        console.error("Paygate status check error:", error);
        return;
      }

      setPaymentData(data);
      const newStatus = data?.status as PaymentStatus || "unknown";
      setStatus(newStatus);

      if (newStatus === "completed") {
        onCompleted?.(data);
        return true; // Stop polling
      }
      if (newStatus === "failed") {
        onFailed?.(data);
        return true;
      }
      if (newStatus === "expired") {
        onExpired?.();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [identifier, tx_reference, onCompleted, onFailed, onExpired]);

  useEffect(() => {
    if (!enabled || (!identifier && !tx_reference)) {
      setStatus("idle");
      return;
    }

    setStatus("pending");
    setAttempts(0);
    let count = 0;

    const poll = async () => {
      count++;
      setAttempts(count);
      const shouldStop = await checkStatus();
      if (shouldStop || count >= maxAttempts) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (count >= maxAttempts && !shouldStop) {
          setStatus("expired");
          onExpired?.();
        }
      }
    };

    // Initial check
    poll();

    intervalRef.current = setInterval(poll, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, identifier, tx_reference, intervalMs, maxAttempts, checkStatus, onExpired]);

  const reset = () => {
    setStatus("idle");
    setAttempts(0);
    setPaymentData(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return { status, attempts, paymentData, reset };
}
