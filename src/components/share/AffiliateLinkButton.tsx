import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { absoluteUrl, withRef } from "@/lib/shareLinks";

interface Props {
  path: string;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "icon";
}

/** Lets the logged-in user copy an affiliate version of any page URL using their referral code. */
const AffiliateLinkButton = ({ path, label = "Lien d'affiliation", variant = "outline", size = "sm" }: Props) => {
  const [refCode, setRefCode] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("affiliations" as any)
        .select("referral_code")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setRefCode((data as any).referral_code);
    })();
  }, []);

  const copy = async () => {
    if (!refCode) { toast.error("Aucun code d'affiliation. Activez-le sur /affiliation"); return; }
    const url = withRef(absoluteUrl(path), refCode);
    try { await navigator.clipboard.writeText(url); toast.success("Lien d'affiliation copié"); }
    catch { toast.error("Impossible de copier"); }
  };

  return (
    <Button variant={variant} size={size} onClick={copy} className="gap-1.5">
      <Sparkles className="w-3.5 h-3.5 text-primary" /> {label} <Copy className="w-3.5 h-3.5" />
    </Button>
  );
};

export default AffiliateLinkButton;
