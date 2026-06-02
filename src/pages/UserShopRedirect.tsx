import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { producerShopUrl } from "@/lib/producerLinks";
import { Loader2 } from "lucide-react";

/** Resolves /@:username to the matching producer shop page. */
const UserShopRedirect = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (!username) { navigate("/", { replace: true }); return; }
      const clean = username.replace(/^@/, "").toLowerCase();
      // 1) try username column
      let { data } = await supabase
        .from("profiles")
        .select("business_name, full_name")
        .ilike("username", clean)
        .maybeSingle();
      // 2) fallback by business_name slug
      if (!data) {
        const { data: byName } = await supabase
          .from("profiles")
          .select("business_name, full_name")
          .ilike("business_name", clean.replace(/-/g, " "))
          .maybeSingle();
        data = byName as any;
      }
      if (!data) { navigate("/producteurs", { replace: true }); return; }
      navigate(producerShopUrl(data.business_name || data.full_name || clean), { replace: true });
    })();
  }, [username, navigate]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
};

export default UserShopRedirect;
