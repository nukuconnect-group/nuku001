import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BodySchema = z.object({
  delivery_id: z.string().uuid(),
  pickup_address: z.string().max(500).optional().default(""),
  dropoff_address: z.string().max(500).optional().default(""),
  distance_km: z.number().optional(),
  driver_fee: z.number().optional(),
});

const VAPID_PUBLIC_KEY = 'BIt17IcmE0C1A6eODRf2JSrZtbImKfTzAOIGyAUg93G4NWmOg9SjSRp_dp6K5nGtL3PSawd5jCA48StW5w9YpeQ'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = 'mailto:contact@nukuconnect.com'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const rawBody = await req.json();
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Données invalides" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { delivery_id, pickup_address, dropoff_address, distance_km, driver_fee } = parsed.data;

    // Get all available & approved drivers
    const { data: drivers } = await supabase
      .from('driver_profiles')
      .select('user_id, zone')
      .eq('is_available', true)
      .eq('is_approved', true);

    if (!drivers || drivers.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No available drivers' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const driverUserIds = drivers.map(d => d.user_id);

    // Get push subscriptions for all available drivers
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', driverUserIds);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No push subscriptions for drivers' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const distText = distance_km ? ` (${distance_km.toFixed(1)} km)` : '';
    const feeText = driver_fee ? ` • ${driver_fee.toLocaleString()} FCFA` : '';
    const title = '🚚 Nouvelle livraison disponible !';
    const body = `${pickup_address || 'Collecte'} → ${dropoff_address || 'Livraison'}${distText}${feeText}`;
    const payload = JSON.stringify({ title, body, url: '/driver-dashboard' });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 300 }
        );
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }

    return new Response(JSON.stringify({ sent, total_drivers: drivers.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('notify-drivers error:', err);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
