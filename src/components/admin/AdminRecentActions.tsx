import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Activity, RefreshCw, UserPlus, Mail, ShoppingCart, Package, Wallet,
  Crown, Shield, Loader2, CheckCircle2, Clock,
} from "lucide-react";

type ActionRow = {
  action_type: string;
  action_time: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  title: string;
  details: any;
};

type EmailConfRow = {
  user_id: string;
  email: string;
  full_name: string;
  user_type: string | null;
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  is_confirmed: boolean;
};

const RANGES: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  signup: { label: "Inscription", icon: UserPlus, color: "bg-blue-500/15 text-blue-700 border-blue-300" },
  email_confirmed: { label: "Email confirmé", icon: Mail, color: "bg-emerald-500/15 text-emerald-700 border-emerald-300" },
  order: { label: "Commande", icon: ShoppingCart, color: "bg-primary/15 text-primary border-primary/30" },
  product: { label: "Produit", icon: Package, color: "bg-amber-500/15 text-amber-700 border-amber-300" },
  withdrawal: { label: "Retrait", icon: Wallet, color: "bg-rose-500/15 text-rose-700 border-rose-300" },
  subscription: { label: "Abonnement", icon: Crown, color: "bg-violet-500/15 text-violet-700 border-violet-300" },
  audit: { label: "Action admin", icon: Shield, color: "bg-slate-500/15 text-slate-700 border-slate-300" },
};

const AdminRecentActions = () => {
  const [rows, setRows] = useState<ActionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("7d");
  const [type, setType] = useState("all");
  const [emailQuery, setEmailQuery] = useState("");
  const [tab, setTab] = useState<"actions" | "confirmations">("actions");

  // Email confirmations tab
  const [confRows, setConfRows] = useState<EmailConfRow[]>([]);
  const [confLoading, setConfLoading] = useState(false);
  const [confStatus, setConfStatus] = useState<"all" | "confirmed" | "pending">("all");
  const [confSearch, setConfSearch] = useState("");

  const fetchActions = async () => {
    setLoading(true);
    const days = RANGES[range] ?? 7;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data, error } = await (supabase as any).rpc("get_admin_recent_actions", {
      p_limit: 500,
      p_since: since,
      p_until: new Date().toISOString(),
      p_type: type === "all" ? null : type,
      p_user_email: emailQuery.trim() || null,
    });
    if (!error && data) setRows(data as ActionRow[]);
    setLoading(false);
  };

  const fetchConfirmations = async () => {
    setConfLoading(true);
    const { data, error } = await (supabase as any).rpc("get_admin_email_confirmations", {
      p_limit: 500,
      p_status: confStatus === "all" ? null : confStatus,
    });
    if (!error && data) setConfRows(data as EmailConfRow[]);
    setConfLoading(false);
  };

  useEffect(() => {
    if (tab === "actions") fetchActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, type, tab]);

  useEffect(() => {
    if (tab === "confirmations") fetchConfirmations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confStatus, tab]);

  const filteredConf = useMemo(() => {
    if (!confSearch.trim()) return confRows;
    const q = confSearch.toLowerCase();
    return confRows.filter(r => r.email.toLowerCase().includes(q) || (r.full_name || "").toLowerCase().includes(q));
  }, [confRows, confSearch]);

  const stats = useMemo(() => {
    const s: Record<string, number> = {};
    rows.forEach(r => { s[r.action_type] = (s[r.action_type] || 0) + 1; });
    return s;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Actions récentes
          </h2>
          <p className="text-sm text-muted-foreground">
            Vue unifiée de toutes les actions de la plateforme.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("actions")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === "actions" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Activités
        </button>
        <button
          onClick={() => setTab("confirmations")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === "confirmations" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Confirmations email
        </button>
      </div>

      {tab === "actions" && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {Object.entries(TYPE_META).map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <Card key={key}>
                  <CardContent className="p-3">
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Icon className="w-3 h-3" /> {meta.label}
                    </div>
                    <div className="text-lg font-bold">{stats[key] || 0}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Filtres</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(["24h", "7d", "30d", "90d"] as const).map((r) => (
                  <Button key={r} variant={range === r ? "default" : "outline"} size="sm" onClick={() => setRange(r)}>
                    {r === "24h" ? "24 h" : r === "7d" ? "7 jours" : r === "30d" ? "30 jours" : "90 jours"}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Type d'action</label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      {Object.entries(TYPE_META).map(([k, m]) => (
                        <SelectItem key={k} value={k}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">Email utilisateur</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="exemple@domaine.com"
                      value={emailQuery}
                      onChange={(e) => setEmailQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && fetchActions()}
                    />
                    <Button onClick={fetchActions} disabled={loading} variant="outline">
                      <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {loading ? (
                <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : rows.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">Aucune action trouvée.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => {
                      const meta = TYPE_META[r.action_type] || TYPE_META.audit;
                      const Icon = meta.icon;
                      return (
                        <TableRow key={`${r.action_type}-${r.action_time}-${i}`}>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${meta.color}`}>
                              <Icon className="w-3 h-3 mr-1" /> {meta.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{r.title}</TableCell>
                          <TableCell className="text-xs">{r.user_name || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{r.user_email || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(r.action_time).toLocaleString("fr-FR")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === "confirmations" && (
        <>
          <Card>
            <CardContent className="p-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="text-xl font-bold">{confRows.length}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Confirmés
                  </div>
                  <div className="text-xl font-bold text-emerald-600">
                    {confRows.filter(r => r.is_confirmed).length}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" /> En attente
                  </div>
                  <div className="text-xl font-bold text-amber-600">
                    {confRows.filter(r => !r.is_confirmed).length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 flex-wrap">
            <Select value={confStatus} onValueChange={(v) => setConfStatus(v as any)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="confirmed">Confirmés</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Rechercher email ou nom"
              value={confSearch}
              onChange={(e) => setConfSearch(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <Button variant="outline" onClick={fetchConfirmations} disabled={confLoading}>
              <RefreshCw className={`w-4 h-4 ${confLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {confLoading ? (
                <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : filteredConf.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">Aucun compte trouvé.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Statut</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Inscrit le</TableHead>
                      <TableHead>Confirmé le</TableHead>
                      <TableHead>Dernière connexion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConf.map((r) => (
                      <TableRow key={r.user_id}>
                        <TableCell>
                          {r.is_confirmed ? (
                            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 border-emerald-300" variant="outline">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Confirmé
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] bg-amber-500/15 text-amber-700 border-amber-300" variant="outline">
                              <Clock className="w-3 h-3 mr-1" /> En attente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{r.email}</TableCell>
                        <TableCell className="text-xs">{r.full_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.user_type || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {r.email_confirmed_at ? new Date(r.email_confirmed_at).toLocaleString("fr-FR") : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleString("fr-FR") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminRecentActions;
