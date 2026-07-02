import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TokenPack {
  id: string;
  code: string;
  name: string;
  price_fcfa: number;
  tokens: number;
  bonus_tokens: number;
  is_popular: boolean;
  description: string | null;
  sort_order: number;
}

export interface TokenTransaction {
  id: string;
  type: "purchase" | "spend" | "expire" | "bonus" | "refund";
  amount: number;
  balance_after: number;
  reason: string | null;
  reference_type: string | null;
  created_at: string;
}

export interface TokenPurchase {
  id: string;
  pack_code: string;
  tokens_purchased: number;
  tokens_remaining: number;
  price_fcfa: number;
  payment_status: string;
  expires_at: string;
  created_at: string;
}

export const useTokens = () => {
  const [balance, setBalance] = useState<number>(0);
  const [packs, setPacks] = useState<TokenPack[]>([]);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [purchases, setPurchases] = useState<TokenPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user.id ?? null;
    setUserId(uid);

    const [packsRes, balRes, txRes, purRes] = await Promise.all([
      supabase.from("token_packs").select("*").eq("is_active", true).order("sort_order"),
      uid ? supabase.rpc("get_user_token_balance", { p_user_id: uid }) : Promise.resolve({ data: 0, error: null }),
      uid ? supabase.from("token_transactions").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [], error: null }),
      uid ? supabase.from("token_purchases").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
    ]);

    if (packsRes.data) setPacks(packsRes.data as TokenPack[]);
    setBalance(typeof balRes.data === "number" ? balRes.data : 0);
    if (txRes.data) setTransactions(txRes.data as TokenTransaction[]);
    if (purRes.data) setPurchases(purRes.data as TokenPurchase[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: instant refresh after admin credit, payment completion, or any token mutation
  useEffect(() => {
    if (!userId) return;
    // Unique channel name per hook instance to avoid "cannot add callbacks after subscribe()"
    // when multiple components mount this hook simultaneously.
    const chName = `tokens-realtime-${userId}-${Math.random().toString(36).slice(2)}`;
    let ch: ReturnType<typeof supabase.channel> | null = null;
    try {
      ch = supabase
        .channel(chName)
        .on("postgres_changes", { event: "*", schema: "public", table: "token_transactions", filter: `user_id=eq.${userId}` },
          () => refresh())
        .on("postgres_changes", { event: "*", schema: "public", table: "token_purchases", filter: `user_id=eq.${userId}` },
          () => refresh())
        .subscribe();
    } catch (e) {
      console.warn("[useTokens] realtime unavailable:", e);
    }
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [userId, refresh]);

  const spendTokens = useCallback(async (amount: number, reason: string, referenceId?: string, referenceType?: string) => {
    if (!userId) return { success: false, error: "not_authenticated" as const };
    const { data, error } = await supabase.rpc("spend_user_tokens", {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_reference_id: referenceId ?? null,
      p_reference_type: referenceType ?? null,
    });
    if (error) return { success: false, error: error.message };
    await refresh();
    return data as { success: boolean; balance: number; spent?: number; error?: string; needed?: number };
  }, [userId, refresh]);

  return { balance, packs, transactions, purchases, loading, userId, refresh, spendTokens };
};
