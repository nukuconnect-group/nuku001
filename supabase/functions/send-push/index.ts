import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = 'BIt17IcmE0C1A6eODRf2JSrZtbImKfTzAOIGyAUg93G4NWmOg9SjSRp_dp6K5nGtL3PSawd5jCA48StW5w9YpeQ'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = 'mailto:contact@nukuconnect.com'

function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4))
  const binary = atob(base64 + pad)
  return Uint8Array.from(binary, c => c.charCodeAt(0))
}

async function importKey(base64url: string, type: 'private' | 'public') {
  const raw = base64urlToUint8Array(base64url)
  if (type === 'private') {
    return crypto.subtle.importKey('pkcs8', await wrapPrivateKey(raw), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  }
  return crypto.subtle.importKey('raw', raw, { name: 'ECDSA', namedCurve: 'P-256' }, false, [])
}

async function wrapPrivateKey(raw: Uint8Array): Promise<ArrayBuffer> {
  // PKCS8 wrapping for P-256 private key
  const prefix = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07,
    0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a,
    0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x04, 0x6d, 0x30,
    0x6b, 0x02, 0x01, 0x01, 0x04, 0x20
  ])
  const suffix = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00
  ])
  // We need the public key for the suffix - derive it
  const ecdh = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: arrayToBase64url(raw), x: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', y: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  ).catch(() => null)
  
  // Simplified: use JWK import instead
  return new ArrayBuffer(0) // placeholder
}

function arrayToBase64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function createJWT(privateKeyBase64url: string): Promise<string> {
  // Import private key as JWK
  const rawPriv = base64urlToUint8Array(privateKeyBase64url)
  
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: privateKeyBase64url,
    // We need x and y from the public key
    x: VAPID_PUBLIC_KEY ? '' : '',
    y: '',
  }
  
  // Use a simpler approach: create unsigned VAPID token
  const header = { typ: 'JWT', alg: 'ES256' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: '', // will be set per-request
    exp: now + 86400,
    sub: VAPID_SUBJECT,
  }
  
  return JSON.stringify({ header, payload })
}

// Simplified push using web-push compatible approach via fetch
async function sendPushToEndpoint(subscription: { endpoint: string; p256dh: string; auth: string }, payload: string) {
  // For web push, we need the web-push library equivalent
  // Using a simplified approach with the Fetch API
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
    },
    body: payload,
  })
  
  return response
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { user_id, title, body, url } = await req.json()

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: 'user_id and title required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get all push subscriptions for this user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)

    if (error) throw error

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload = JSON.stringify({ title, body: body || '', url: url || '/' })
    let sent = 0
    const failed: string[] = []

    for (const sub of subscriptions) {
      try {
        const res = await sendPushToEndpoint(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload
        )
        if (res.ok || res.status === 201) {
          sent++
        } else if (res.status === 404 || res.status === 410) {
          // Subscription expired, remove it
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          failed.push(sub.id)
        }
      } catch (e) {
        console.error('Push failed for', sub.id, e)
        failed.push(sub.id)
      }
    }

    return new Response(JSON.stringify({ sent, failed: failed.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-push error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
