import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://www.nukuconnect.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch all products with slugs
    const { data: products } = await supabase
      .from("products")
      .select("slug, updated_at")
      .not("slug", "is", null)
      .order("updated_at", { ascending: false });

    // Fetch all published formations with slugs
    const { data: formations } = await supabase
      .from("formations")
      .select("slug, updated_at")
      .eq("is_published", true)
      .not("slug", "is", null)
      .order("updated_at", { ascending: false });

    // Fetch active categories
    const { data: categories } = await supabase
      .from("categories")
      .select("name")
      .eq("is_active", true);

    const now = new Date().toISOString().split("T")[0];

    // Static pages
    const staticPages = [
      { loc: "/", priority: "1.0", changefreq: "daily" },
      { loc: "/marketplace", priority: "0.9", changefreq: "daily" },
      { loc: "/formations", priority: "0.8", changefreq: "weekly" },
      { loc: "/producteurs", priority: "0.7", changefreq: "weekly" },
      { loc: "/blog", priority: "0.7", changefreq: "weekly" },
      { loc: "/a-propos", priority: "0.5", changefreq: "monthly" },
      { loc: "/contact", priority: "0.5", changefreq: "monthly" },
      { loc: "/aide", priority: "0.4", changefreq: "monthly" },
      { loc: "/plans", priority: "0.6", changefreq: "monthly" },
      { loc: "/devenir-fournisseur", priority: "0.6", changefreq: "monthly" },
      { loc: "/tracabilite", priority: "0.5", changefreq: "monthly" },
      { loc: "/nuku-ai", priority: "0.6", changefreq: "monthly" },
      { loc: "/affiliation", priority: "0.5", changefreq: "monthly" },
      { loc: "/auth", priority: "0.4", changefreq: "monthly" },
      { loc: "/mentions-legales", priority: "0.2", changefreq: "yearly" },
      { loc: "/confidentialite", priority: "0.2", changefreq: "yearly" },
      { loc: "/conditions", priority: "0.2", changefreq: "yearly" },
    ];

    // Blog articles (hardcoded slugs matching the app)
    const blogSlugs = [
      "nukuconnect-meilleure-innovation-togo-top-impact-2025",
      "intelligence-artificielle-agriculture-afrique",
      "tracabilite-produits-agricoles-confiance-consommateur",
      "marketplace-agricole-connecter-producteurs-acheteurs",
      "formation-agricole-numerique-competences-producteurs",
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Static pages
    for (const page of staticPages) {
      xml += `  <url>
    <loc>${SITE_URL}${page.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Blog articles
    for (const slug of blogSlugs) {
      xml += `  <url>
    <loc>${SITE_URL}/blog/${slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    }

    // Category pages
    if (categories) {
      for (const cat of categories) {
        xml += `  <url>
    <loc>${SITE_URL}/marketplace?category=${encodeURIComponent(cat.name.toLowerCase())}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    // Product pages
    if (products) {
      for (const product of products) {
        const lastmod = product.updated_at
          ? new Date(product.updated_at).toISOString().split("T")[0]
          : now;
        xml += `  <url>
    <loc>${SITE_URL}/produit/${encodeURIComponent(product.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }
    }

    // Formation pages
    if (formations) {
      for (const formation of formations) {
        const lastmod = formation.updated_at
          ? new Date(formation.updated_at).toISOString().split("T")[0]
          : now;
        xml += `  <url>
    <loc>${SITE_URL}/formations/${encodeURIComponent(formation.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  }
});
