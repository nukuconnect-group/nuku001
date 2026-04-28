import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { listTrackingParams, stripTrackingFromUrl } from "@/lib/trackingParams";

/**
 * Strips known tracking params (srsltid, gclid, fbclid, utm_*, msutm, aff, ...)
 * from the URL bar without reloading. The affiliation `ref` param is preserved.
 *
 * The canonical link is also emitted by <SEO/> and ALWAYS strips query strings
 * so search engines consolidate signals on the clean URL.
 */
const CleanTrackingParams = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const href = window.location.href;
    if (listTrackingParams(href).length === 0) return;
    const cleanUrl = stripTrackingFromUrl(href);
    window.history.replaceState(window.history.state, "", cleanUrl);
  }, [location.pathname, location.search]);

  return null;
};

export default CleanTrackingParams;
