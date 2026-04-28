import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Strips known tracking params from the URL bar without reloading.
 * Helps avoid duplicate-content issues in Google when the site is
 * crawled with Google Merchant `srsltid`, Google Ads `gclid`,
 * Facebook `fbclid`, etc.
 *
 * The canonical link is also emitted by <SEO/> and now ALWAYS strips
 * query strings so search engines consolidate signals on the clean URL.
 */
const TRACKING_PARAMS = [
  "srsltid",   // Google Merchant / Shopping
  "gclid",     // Google Ads
  "gbraid",
  "wbraid",
  "fbclid",    // Facebook
  "msclkid",   // Microsoft Ads
  "yclid",     // Yandex
  "_ga",
  "mc_cid",
  "mc_eid",
];

const CleanTrackingParams = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    let changed = false;
    for (const p of TRACKING_PARAMS) {
      if (url.searchParams.has(p)) {
        url.searchParams.delete(p);
        changed = true;
      }
    }
    if (changed) {
      const cleanUrl =
        url.pathname +
        (url.searchParams.toString() ? `?${url.searchParams}` : "") +
        url.hash;
      window.history.replaceState(window.history.state, "", cleanUrl);
    }
  }, [location.pathname, location.search]);

  return null;
};

export default CleanTrackingParams;
