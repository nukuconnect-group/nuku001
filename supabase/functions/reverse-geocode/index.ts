const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');
    if (!lat || !lng) {
      return new Response(JSON.stringify({ error: 'lat/lng required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr&zoom=16`,
      { headers: { 'User-Agent': 'NukuConnect/1.0 (contact@nukuconnect.com)' } }
    );
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const j = await res.json();
    const a = j.address || {};
    const country = a.country || '';
    const city = a.city || a.town || a.village || a.municipality || '';
    const quarter = a.neighbourhood || a.suburb || a.quarter || a.hamlet || a.city_district || '';
    const display = [quarter, city, country].filter(Boolean).join(', ') || j.display_name || '';
    return new Response(
      JSON.stringify({ country, city, quarter, display, raw: a }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
