import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * /mon-compte — entry point from KYC status emails.
 * Redirects to the exact KYC screen (driver/supplier) and forwards
 * already-approved users straight to their dashboard.
 */
const AccountAccess = () => {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Chargement de votre compte…");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth?returnTo=/mon-compte", { replace: true });
        return;
      }

      // Newest KYC across both tables
      const [{ data: dRows }, { data: sRows }] = await Promise.all([
        supabase.from("driver_kyc_submissions")
          .select("status,created_at").eq("user_id", user.id)
          .order("created_at", { ascending: false }).limit(1),
        supabase.from("supplier_kyc_submissions")
          .select("status,created_at").eq("user_id", user.id)
          .order("created_at", { ascending: false }).limit(1),
      ]);

      const driver = dRows?.[0];
      const supplier = sRows?.[0];

      // Pick the most recent submission to decide route
      const latest = [driver && { ...driver, type: "driver" as const },
                      supplier && { ...supplier, type: "supplier" as const }]
        .filter(Boolean)
        .sort((a, b) => new Date(b!.created_at).getTime() - new Date(a!.created_at).getTime())[0];

      if (!latest) {
        setMsg("Redirection vers votre tableau de bord…");
        navigate("/dashboard", { replace: true });
        return;
      }

      if (latest.status === "approved") {
        navigate(latest.type === "driver" ? "/driver-dashboard" : "/dashboard", { replace: true });
      } else {
        // Still pending or rejected → send them to the KYC screen for that flow
        navigate(latest.type === "driver" ? "/driver-dashboard?kyc=1" : "/dashboard?kyc=1", { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{msg}</p>
    </div>
  );
};

export default AccountAccess;
