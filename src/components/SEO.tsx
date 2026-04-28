import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { useSeoSettings } from "@/hooks/useSeoSettings";

const BASE_URL = "https://www.nukuconnect.com";

/** Build a canonical URL stripped of tracking params (srsltid, gclid, fbclid, utm_*, ...). */
const buildCanonical = (path: string): string => {
  // Keep only the pathname; drop query + hash entirely so Google consolidates
  // /?srsltid=... and / on the same canonical entry.
  const cleanPath = path.split("?")[0].split("#")[0] || "/";
  return `${BASE_URL}${cleanPath}`;
};
const DEFAULT_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/C3YioAkra3hJ4npw1XZX0HbG8E32/social-images/social-1769858107990-NUKUCONNECT-LOGO5-2.png";
const SITE_NAME = "NUKUCONNECT";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "product" | "article" | "profile";
  /** JSON-LD structured data object */
  jsonLd?: Record<string, unknown>;
  noIndex?: boolean;
}

const SEO = ({
  title,
  description = "NUKUCONNECT : la marketplace agricole intelligente d'Afrique. Achetez et vendez des produits agricoles, connectez-vous avec des producteurs vérifiés.",
  image,
  url,
  type = "website",
  jsonLd,
  noIndex = false,
}: SEOProps) => {
  // Override from DB (admin-editable). Falls back silently to coded values.
  const override = useSeoSettings(url);
  const finalTitle = override?.title || title;
  const finalDescription = override?.description || description;
  const finalImage = override?.og_image_url || image;
  const finalUrl = override?.canonical_path || url;
  const finalNoIndex = override?.no_index ?? noIndex;
  const keywords = override?.keywords;

  // Always compute a clean canonical: prefer explicit url/override, otherwise use current path.
  const location = useLocation();
  const canonicalPath = finalUrl || location.pathname || "/";
  const canonicalUrl = buildCanonical(canonicalPath);

  const fullTitle = finalTitle ? `${finalTitle} | ${SITE_NAME}` : `${SITE_NAME} - Marketplace Agricole Intelligent d'Afrique`;
  const ogImage = finalImage || DEFAULT_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={finalDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      {finalNoIndex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:locale" content="fr_FR" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export default SEO;
