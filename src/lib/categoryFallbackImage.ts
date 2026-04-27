// Fallback image par catégorie — utilisé partout dans l'app pour éviter les images cassées
const categoryFallbackImages: Record<string, string> = {
  cereales: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80",
  céréales: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80",
  legumes: "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=600&q=80",
  légumes: "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=600&q=80",
  fruits: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&q=80",
  tubercules: "https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=600&q=80",
  elevage: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&q=80",
  élevage: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&q=80",
  aviculture: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=600&q=80",
  volailles: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=600&q=80",
  pisciculture: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=600&q=80",
  aquaculture: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=600&q=80",
  poisson: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=600&q=80",
  agriculture: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80",
  agribusiness: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=80",
  agrobusiness: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=80",
  equipement: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80",
  équipement: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80",
  tomate: "https://images.unsplash.com/photo-1546470427-227df1b44d44?w=600&q=80",
  mais: "https://images.unsplash.com/photo-1601593768799-76d3ca2fbd58?w=600&q=80",
  maïs: "https://images.unsplash.com/photo-1601593768799-76d3ca2fbd58?w=600&q=80",
  riz: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80",
  manioc: "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600&q=80",
};

const DEFAULT_FALLBACK = "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=600&q=80";

export const getCategoryFallbackImage = (category?: string, name?: string): string => {
  const haystack = `${(name || "").toLowerCase()} ${(category || "").toLowerCase()}`.trim();
  for (const [k, v] of Object.entries(categoryFallbackImages)) {
    if (haystack.includes(k)) return v;
  }
  return DEFAULT_FALLBACK;
};
