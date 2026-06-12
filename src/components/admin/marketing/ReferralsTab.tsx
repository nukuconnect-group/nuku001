import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, Wallet, Clock, Search, TrendingUp } from "lucide-react";

interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id: string | null;
  referral_code: string;
  status: string;
  created_at: string;
  activated_at: string | null;
}

interface Earning {
  id: string;
  referrer_id: string;
  amount: number;
  commission_rate: number;
  source_type: string;
  source_amount: number;
  description: string | null;
  created_at: string;
}

interface ProfileLite {
  id: string;
  full_name: string | null;
  email: string | null;
}

const fmtFcfa = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " FCFA";

const ReferralsTab = () => {
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [search, setSearch] = useState("");
  const [earningsFilter, setEarningsFilter] = useState<"all" | "validated" | "pending">("all");

  const load = async () => {
    setLoading(true);
    const [{ data: refs }, { data: earns }] = await Promise.all([
      supabase.from("referrals").select("*").order("created_at", { ascending: false }).limit(500),
      supabase
        .from("referral_earnings" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const referralsList = (refs as Referral[]) || [];
    const earningsList = (earns as unknown as Earning[]) || [];
    setReferrals(referralsList);
    setEarnings(earningsList);

    const userIds = Array.from(
      new Set<string>([
        ...referralsList.flatMap((r) => [r.referrer_id, r.referred_user_id].filter(Boolean) as string[]),
        ...earningsList.map((e) => e.referrer_id),
      ]),
    );
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      const map: Record<string, ProfileLite> = {};
      (profs as ProfileLite[] | null)?.forEach((p) => (map[p.id] = p));
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const activated = referrals.filter((r) => r.status === "activated").length;
    const pendingRefs = referrals.length - activated;
    const validatedGains = earnings
      .filter((e) => e.source_type !== "pending")
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const pendingGains = earnings
      .filter((e) => e.source_type === "pending")
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    return { totalRefs: referrals.length, activated, pendingRefs, validatedGains, pendingGains };
  }, [referrals, earnings]);

  const filteredCodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Group by code (a user may have multiple rows sharing the same code historically)
    const byCode = new Map<string, { code: string; referrer: ProfileLite | undefined; total: number; activated: number; lastAt: string }>();
    for (const r of referrals) {
      const key = r.referral_code;
      const existing = byCode.get(key);
      const ref = profiles[r.referrer_id];
      if (!existing) {
        byCode.set(key, {
          code: r.referral_code,
          referrer: ref,
          total: 1,
          activated: r.status === "activated" ? 1 : 0,
          lastAt: r.created_at,
        });
      } else {
        existing.total++;
        if (r.status === "activated") existing.activated++;
        if (r.created_at > existing.lastAt) existing.lastAt = r.created_at;
      }
    }
    return Array.from(byCode.values())
      .filter((c) => {
        if (!q) return true;
        return (
          c.code.toLowerCase().includes(q) ||
          c.referrer?.full_name?.toLowerCase().includes(q) ||
          c.referrer?.email?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }, [referrals, profiles, search]);

  const filteredActivations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return referrals
      .filter((r) => {
        if (!q) return true;
        const ref = profiles[r.referrer_id];
        const child = r.referred_user_id ? profiles[r.referred_user_id] : undefined;
        return (
          r.referral_code.toLowerCase().includes(q) ||
          ref?.full_name?.toLowerCase().includes(q) ||
          ref?.email?.toLowerCase().includes(q) ||
          child?.full_name?.toLowerCase().includes(q) ||
          child?.email?.toLowerCase().includes(q)
        );
      })
      .slice(0, 200);
  }, [referrals, profiles, search]);

  const filteredEarnings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return earnings
      .filter((e) => {
        if (earningsFilter === "validated" && e.source_type === "pending") return false;
        if (earningsFilter === "pending" && e.source_type !== "pending") return false;
        if (!q) return true;
        const ref = profiles[e.referrer_id];
        return (
          ref?.full_name?.toLowerCase().includes(q) ||
          ref?.email?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q)
        );
      })
      .slice(0, 200);
  }, [earnings, profiles, search, earningsFilter]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
              <Users className="w-3 h-3" /> Filleuls
            </div>
            <p className="text-lg font-bold">{stats.totalRefs}</p>
            <p className="text-[10px] text-muted-foreground">{stats.activated} activés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
              <Clock className="w-3 h-3" /> En attente
            </div>
            <p className="text-lg font-bold">{stats.pendingRefs}</p>
            <p className="text-[10px] text-muted-foreground">filleuls non activés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 mb-1">
              <Wallet className="w-3 h-3" /> Gains validés
            </div>
            <p className="text-sm font-bold text-emerald-700">{fmtFcfa(stats.validatedGains)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 mb-1">
              <TrendingUp className="w-3 h-3" /> Gains en attente
            </div>
            <p className="text-sm font-bold text-amber-700">{fmtFcfa(stats.pendingGains)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un code, un parrain ou un filleul..."
          className="pl-8 text-xs h-9"
        />
      </div>

      <Tabs defaultValue="codes">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="codes" className="text-xs">Codes</TabsTrigger>
          <TabsTrigger value="activations" className="text-xs">Activations</TabsTrigger>
          <TabsTrigger value="earnings" className="text-xs">Gains</TabsTrigger>
        </TabsList>

        <TabsContent value="codes">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">{filteredCodes.length} codes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredCodes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Aucun code</p>
              ) : (
                filteredCodes.map((c) => (
                  <div key={c.code} className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/20">
                    <div className="min-w-0 flex-1">
                      <code className="text-xs font-bold text-primary">{c.code}</code>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {c.referrer?.full_name || c.referrer?.email || "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-[9px]">
                        {c.activated}/{c.total} activés
                      </Badge>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {new Date(c.lastAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activations">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">{filteredActivations.length} entrées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {filteredActivations.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Aucune activation</p>
              ) : (
                filteredActivations.map((r) => {
                  const ref = profiles[r.referrer_id];
                  const child = r.referred_user_id ? profiles[r.referred_user_id] : null;
                  return (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/20">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">
                          {child?.full_name || child?.email || "Filleul anonyme"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          via {ref?.full_name || ref?.email || "—"} · <code>{r.referral_code}</code>
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={`text-[9px] ${
                            r.status === "activated"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {r.status === "activated" ? "Activé" : "En attente"}
                        </Badge>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {new Date(r.activated_at || r.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs">{filteredEarnings.length} gains</CardTitle>
              <div className="flex gap-1">
                {(["all", "validated", "pending"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setEarningsFilter(f)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      earningsFilter === f
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {f === "all" ? "Tous" : f === "validated" ? "Validés" : "En attente"}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {filteredEarnings.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Aucun gain</p>
              ) : (
                filteredEarnings.map((e) => {
                  const ref = profiles[e.referrer_id];
                  const isPending = e.source_type === "pending";
                  return (
                    <div key={e.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/20">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">
                          {ref?.full_name || ref?.email || "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {e.description || e.source_type} · {Math.round(Number(e.commission_rate) * 100)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold ${isPending ? "text-amber-700" : "text-emerald-700"}`}>
                          {fmtFcfa(Number(e.amount))}
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          {new Date(e.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReferralsTab;
