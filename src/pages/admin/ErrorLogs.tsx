import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw } from "lucide-react";

interface ErrorRow {
  id: string;
  user_id: string | null;
  conversation_id: string | null;
  message: string;
  stack: string | null;
  page: string | null;
  component: string | null;
  severity: string;
  meta: Record<string, unknown> | null;
  user_agent: string | null;
  created_at: string;
}

const severityColor: Record<string, string> = {
  info: "bg-muted text-muted-foreground",
  warning: "bg-amber-500/15 text-amber-700 border border-amber-500/30",
  error: "bg-destructive/15 text-destructive border border-destructive/30",
  fatal: "bg-destructive text-destructive-foreground",
};

export default function ErrorLogs() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ErrorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [filter, setFilter] = useState("");
  const [severity, setSeverity] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) { setAllowed(false); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setAllowed(!!data);
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setRows((data as ErrorRow[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (allowed) load();
  }, [allowed]);

  if (allowed === false) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <p className="text-destructive">{t("admin.errors.forbidden") || "Accès administrateur requis."}</p>
      </div>
    );
  }

  const filtered = rows.filter((r) => {
    if (severity !== "all" && r.severity !== severity) return false;
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      r.message?.toLowerCase().includes(q) ||
      r.page?.toLowerCase().includes(q) ||
      r.component?.toLowerCase().includes(q) ||
      r.user_id?.toLowerCase().includes(q) ||
      r.conversation_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
      <Helmet>
        <title>{t("admin.errors.title") || "Journal des erreurs"} · Nukuconnect</title>
      </Helmet>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> {t("common.back") || "Retour"}
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold">
          {t("admin.errors.title") || "Journal des erreurs"}
        </h1>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="ml-auto">
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh") || "Rafraîchir"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin.errors.filters") || "Filtres"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder={t("admin.errors.search.placeholder") || "Rechercher (message, page, user_id, conversation_id)…"}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm bg-background"
          >
            <option value="all">{t("admin.errors.severity.all") || "Toutes gravités"}</option>
            <option value="info">info</option>
            <option value="warning">warning</option>
            <option value="error">error</option>
            <option value="fatal">fatal</option>
          </select>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filtered.length === 0 && !loading && (
          <p className="text-muted-foreground text-sm text-center py-8">
            {t("admin.errors.empty") || "Aucune erreur enregistrée."}
          </p>
        )}
        {filtered.map((r) => (
          <Card key={r.id} className="overflow-hidden">
            <CardContent className="p-3 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge className={severityColor[r.severity] ?? ""}>{r.severity}</Badge>
                <span className="text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </span>
                {r.page && <span className="font-mono text-primary">{r.page}</span>}
                {r.component && <Badge variant="outline">{r.component}</Badge>}
              </div>
              <p className="text-sm font-medium break-words">{r.message}</p>
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                {r.user_id && (
                  <span>
                    user:{" "}
                    <Link className="text-primary hover:underline" to={`/admin?user=${r.user_id}`}>
                      {r.user_id.slice(0, 8)}…
                    </Link>
                  </span>
                )}
                {r.conversation_id && (
                  <span>
                    conv:{" "}
                    <Link className="text-primary hover:underline" to={`/messages?c=${r.conversation_id}`}>
                      {r.conversation_id.slice(0, 8)}…
                    </Link>
                  </span>
                )}
                {r.user_agent && <span className="truncate max-w-[280px]" title={r.user_agent}>UA: {r.user_agent}</span>}
              </div>
              {r.stack && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    {t("admin.errors.stack") || "Stack"}
                  </summary>
                  <pre className="mt-1 p-2 bg-muted rounded text-[11px] overflow-x-auto whitespace-pre-wrap break-words">
                    {r.stack}
                  </pre>
                </details>
              )}
              {r.meta && Object.keys(r.meta).length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    {t("admin.errors.meta") || "Contexte"}
                  </summary>
                  <pre className="mt-1 p-2 bg-muted rounded text-[11px] overflow-x-auto">
                    {JSON.stringify(r.meta, null, 2)}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
