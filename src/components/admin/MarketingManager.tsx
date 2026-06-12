import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Tag, Send, FileText, Plus, Trash2, Loader2, Copy, CheckCircle,
  Mail, Users, Percent, DollarSign, Calendar, Eye, BarChart3, Gift
} from "lucide-react";
import ReferralsTab from "./marketing/ReferralsTab";

/* ─── PROMO CODES TAB ─── */
const PromoCodesTab = () => {
  const { toast } = useToast();
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: "",
    min_order_amount: "",
    max_uses: "",
    expires_at: "",
  });

  const fetchCodes = async () => {
    const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
    setCodes((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCodes(); }, []);

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let c = "NUKU";
    for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
    setForm(p => ({ ...p, code: c }));
  };

  const createCode = async () => {
    if (!form.code || !form.discount_value) {
      toast({ title: "Champs requis", description: "Code et valeur de réduction obligatoires", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("promo_codes").insert({
      code: form.code.toUpperCase(),
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null,
    } as any);
    setCreating(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Code promo créé" });
      setForm({ code: "", discount_type: "percentage", discount_value: "", min_order_amount: "", max_uses: "", expires_at: "" });
      fetchCodes();
    }
  };

  const toggleCode = async (id: string, active: boolean) => {
    await supabase.from("promo_codes").update({ is_active: !active } as any).eq("id", id);
    fetchCodes();
  };

  const deleteCode = async (id: string) => {
    if (!confirm("Supprimer ce code promo ?")) return;
    await supabase.from("promo_codes").delete().eq("id", id);
    fetchCodes();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Nouveau code promo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="CODE" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} className="flex-1 text-xs" />
            <Button variant="outline" size="sm" onClick={generateCode} className="text-xs gap-1"><Tag className="w-3 h-3" />Générer</Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.discount_type} onValueChange={v => setForm(p => ({ ...p, discount_type: v }))}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                <SelectItem value="fixed">Montant fixe (FCFA)</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Valeur" value={form.discount_value} onChange={e => setForm(p => ({ ...p, discount_value: e.target.value }))} className="text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="Min. commande (FCFA)" value={form.min_order_amount} onChange={e => setForm(p => ({ ...p, min_order_amount: e.target.value }))} className="text-xs" />
            <Input type="number" placeholder="Utilisations max" value={form.max_uses} onChange={e => setForm(p => ({ ...p, max_uses: e.target.value }))} className="text-xs" />
          </div>
          <Input type="datetime-local" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} className="text-xs" />
          <Button onClick={createCode} disabled={creating} className="w-full text-xs gap-1">
            {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Créer le code promo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Codes promo existants ({codes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : codes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucun code promo</p>
          ) : (
            <div className="space-y-2">
              {codes.map(c => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-bold text-primary">{c.code}</code>
                      <Badge variant={c.is_active ? "default" : "secondary"} className="text-[8px]">
                        {c.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {c.discount_type === "percentage" ? `${c.discount_value}%` : `${c.discount_value} FCFA`}
                      {c.max_uses && ` • ${c.current_uses}/${c.max_uses} utilisations`}
                      {c.expires_at && ` • Expire ${new Date(c.expires_at).toLocaleDateString("fr-FR")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => { navigator.clipboard.writeText(c.code); toast({ title: "Copié !" }); }}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Switch checked={c.is_active} onCheckedChange={() => toggleCode(c.id, c.is_active)} />
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => deleteCode(c.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* ─── CAMPAIGNS TAB ─── */
const CampaignsTab = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ subject: "", html_content: "", target_segment: "all" });

  const fetchAll = async () => {
    const [{ data: c }, { data: t }] = await Promise.all([
      supabase.from("marketing_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("marketing_templates").select("*").order("name"),
    ]);
    setCampaigns((c as any[]) || []);
    setTemplates((t as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const applyTemplate = (tpl: any) => {
    setForm(p => ({ ...p, subject: tpl.subject, html_content: tpl.html_content }));
    toast({ title: "Modèle appliqué", description: tpl.name });
  };

  const saveDraft = async () => {
    if (!form.subject) return;
    const { error } = await supabase.from("marketing_campaigns").insert({
      subject: form.subject,
      html_content: form.html_content,
      target_segment: form.target_segment,
      status: "draft",
    } as any);
    if (!error) {
      toast({ title: "✅ Brouillon enregistré" });
      setForm({ subject: "", html_content: "", target_segment: "all" });
      fetchAll();
    }
  };

  const sendCampaign = async (campaignId?: string) => {
    setSending(true);
    try {
      const campaign = campaignId ? campaigns.find(c => c.id === campaignId) : form;
      // Get target users
      let query = supabase.from("profiles").select("id, email, user_type, full_name");
      if (campaign.target_segment && campaign.target_segment !== "all") {
        const typeMap: Record<string, string> = { buyers: "buyer", producers: "producer", drivers: "driver", trainers: "trainer", learners: "learner" };
        query = query.eq("user_type", typeMap[campaign.target_segment] || campaign.target_segment);
      }
      const { data: users } = await query;
      const count = users?.length || 0;

      if (campaignId) {
        await supabase.from("marketing_campaigns").update({ status: "sent", sent_at: new Date().toISOString(), recipients_count: count } as any).eq("id", campaignId);
      } else {
        await supabase.from("marketing_campaigns").insert({
          subject: form.subject,
          html_content: form.html_content,
          target_segment: form.target_segment,
          status: "sent",
          sent_at: new Date().toISOString(),
          recipients_count: count,
        } as any);
      }

      toast({ title: `📧 Campagne envoyée`, description: `${count} destinataires ciblés` });
      setForm({ subject: "", html_content: "", target_segment: "all" });
      fetchAll();
    } catch (err) {
      toast({ title: "Erreur", variant: "destructive" });
    }
    setSending(false);
  };

  const segmentLabels: Record<string, string> = {
    all: "Tous", buyers: "Acheteurs", producers: "Producteurs", drivers: "Livreurs", trainers: "Formateurs", learners: "Apprenants"
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: "Brouillon", color: "bg-muted text-muted-foreground" },
    scheduled: { label: "Planifié", color: "bg-blue-100 text-blue-700" },
    sent: { label: "Envoyé", color: "bg-emerald-100 text-emerald-700" },
    cancelled: { label: "Annulé", color: "bg-red-100 text-red-700" },
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Mail className="w-4 h-4" /> Nouvelle campagne</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Templates */}
          {templates.length > 0 && (
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1">Modèles préconstruits</Label>
              <div className="flex gap-1.5 flex-wrap">
                {templates.map(t => (
                  <Button key={t.id} variant="outline" size="sm" className="text-[10px] gap-1 h-7" onClick={() => applyTemplate(t)}>
                    <FileText className="w-3 h-3" /> {t.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <Input placeholder="Sujet de l'email" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className="text-xs" />
          <Select value={form.target_segment} onValueChange={v => setForm(p => ({ ...p, target_segment: v }))}>
            <SelectTrigger className="text-xs"><SelectValue placeholder="Segment cible" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les utilisateurs</SelectItem>
              <SelectItem value="buyers">Acheteurs</SelectItem>
              <SelectItem value="producers">Producteurs</SelectItem>
              <SelectItem value="drivers">Livreurs</SelectItem>
              <SelectItem value="trainers">Formateurs</SelectItem>
              <SelectItem value="learners">Apprenants</SelectItem>
            </SelectContent>
          </Select>
          <Textarea placeholder="Contenu HTML de l'email..." value={form.html_content} onChange={e => setForm(p => ({ ...p, html_content: e.target.value }))} className="text-xs min-h-[120px]" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveDraft} className="flex-1 text-xs gap-1"><FileText className="w-3 h-3" />Brouillon</Button>
            <Button onClick={() => sendCampaign()} disabled={sending || !form.subject} className="flex-1 text-xs gap-1">
              {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Envoyer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Historique ({campaigns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : campaigns.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune campagne</p>
          ) : (
            <div className="space-y-2">
              {campaigns.map(c => (
                <div key={c.id} className="p-2 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold truncate flex-1">{c.subject}</p>
                    <Badge className={`text-[8px] ${statusLabels[c.status]?.color || ""}`}>
                      {statusLabels[c.status]?.label || c.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span><Users className="w-3 h-3 inline mr-0.5" />{segmentLabels[c.target_segment] || c.target_segment}</span>
                    <span>{c.recipients_count || 0} destinataires</span>
                    {c.sent_at && <span>{new Date(c.sent_at).toLocaleDateString("fr-FR")}</span>}
                  </div>
                  {c.status === "draft" && (
                    <Button variant="hero" size="sm" className="mt-2 text-[10px] h-6 gap-1" onClick={() => sendCampaign(c.id)} disabled={sending}>
                      <Send className="w-3 h-3" /> Envoyer
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* ─── MAIN MARKETING MANAGER ─── */
const MarketingManager = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Tag className="w-5 h-5 text-primary" />
        <h2 className="font-heading text-base font-bold">Marketing</h2>
      </div>
      <Tabs defaultValue="promos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="promos" className="text-xs gap-1"><Percent className="w-3 h-3" />Codes promo</TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs gap-1"><Mail className="w-3 h-3" />Campagnes</TabsTrigger>
          <TabsTrigger value="referrals" className="text-xs gap-1"><Gift className="w-3 h-3" />Parrainage</TabsTrigger>
        </TabsList>
        <TabsContent value="promos"><PromoCodesTab /></TabsContent>
        <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
        <TabsContent value="referrals"><ReferralsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketingManager;
