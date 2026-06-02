import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";

type Pixel = { id: string; provider: "meta" | "tiktok" | "ga4" | "gtm" | "snapchat"; pixel_id: string; is_active: boolean };

/** Injects per-user marketing pixels in <head> when the visited shop owner has configured them. */
const UserPixels = ({ ownerUserId }: { ownerUserId?: string | null }) => {
  const { profile } = useProfile();
  const target = ownerUserId || profile?.user_id;
  const [pixels, setPixels] = useState<Pixel[]>([]);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("tracking_pixels" as any)
        .select("id, provider, pixel_id, is_active")
        .eq("user_id", target)
        .eq("is_active", true);
      if (!cancelled) setPixels(((data as any[]) || []) as Pixel[]);
    })();
    return () => { cancelled = true; };
  }, [target]);

  if (pixels.length === 0) return null;

  const scripts: string[] = [];
  for (const p of pixels) {
    if (p.provider === "meta") {
      scripts.push(`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${p.pixel_id}');fbq('track','PageView');`);
    } else if (p.provider === "tiktok") {
      scripts.push(`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${p.pixel_id}');ttq.page();}(window,document,'ttq');`);
    } else if (p.provider === "ga4") {
      scripts.push(`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${p.pixel_id}');`);
    } else if (p.provider === "gtm") {
      scripts.push(`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${p.pixel_id}');`);
    } else if (p.provider === "snapchat") {
      scripts.push(`(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');snaptr('init','${p.pixel_id}');snaptr('track','PAGE_VIEW');`);
    }
  }

  const ga4 = pixels.find((p) => p.provider === "ga4");

  return (
    <Helmet>
      {ga4 && <script async src={`https://www.googletagmanager.com/gtag/js?id=${ga4.pixel_id}`}></script>}
      {scripts.map((s, i) => (
        <script key={i}>{s}</script>
      ))}
    </Helmet>
  );
};

export default UserPixels;
