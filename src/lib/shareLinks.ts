const BASE = "https://nukuconnect.com";

export const absoluteUrl = (path: string) => {
  if (/^https?:\/\//.test(path)) return path;
  return BASE + (path.startsWith("/") ? path : "/" + path);
};

export const withRef = (url: string, refCode?: string | null) => {
  if (!refCode) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}ref=${encodeURIComponent(refCode)}`;
};

export const shareTargets = (url: string, text = "") => {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return {
    whatsapp: `https://wa.me/?text=${t}%20${u}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    twitter: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    email: `mailto:?subject=${t}&body=${u}`,
  };
};
