// Cron-driven: scans unread messages older than 5 minutes and sends a single
// email + in-app notification reminder to the recipient. Idempotent via
// messages.reminder_sent_at column.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    // Window: messages between 5 and 60 minutes old, unread, no reminder sent yet
    const now = Date.now();
    const fiveMinAgo = new Date(now - 5 * 60 * 1000).toISOString();
    const sixtyMinAgo = new Date(now - 60 * 60 * 1000).toISOString();

    const { data: msgs, error } = await admin
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .eq("is_read", false)
      .is("reminder_sent_at", null)
      .lte("created_at", fiveMinAgo)
      .gte("created_at", sixtyMinAgo)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) throw error;
    if (!msgs?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    for (const m of msgs) {
      try {
        // Resolve conversation participants
        const { data: conv } = await admin
          .from("conversations")
          .select("id, buyer_id, seller_id, product_id")
          .eq("id", m.conversation_id)
          .maybeSingle();
        if (!conv) {
          await admin.from("messages").update({ reminder_sent_at: new Date().toISOString() }).eq("id", m.id);
          continue;
        }

        // Recipient profile (the participant != sender)
        const recipientProfileId = m.sender_id === conv.buyer_id ? conv.seller_id : conv.buyer_id;
        const { data: recipientProfile } = await admin
          .from("profiles")
          .select("user_id, full_name")
          .eq("id", recipientProfileId)
          .maybeSingle();
        if (!recipientProfile?.user_id) {
          await admin.from("messages").update({ reminder_sent_at: new Date().toISOString() }).eq("id", m.id);
          continue;
        }

        // Sender display name
        const { data: senderProfile } = await admin
          .from("profiles")
          .select("full_name")
          .eq("id", m.sender_id)
          .maybeSingle();
        const senderName = senderProfile?.full_name || "Un utilisateur";

        // Recipient email (from auth.users)
        const { data: authUser } = await admin.auth.admin.getUserById(recipientProfile.user_id);
        const recipientEmail = authUser?.user?.email;

        // In-app notification (always)
        await admin.from("notifications").insert({
          user_id: recipientProfile.user_id,
          type: "message",
          title: "⏰ Message en attente",
          description: `${senderName} vous a écrit il y a quelques minutes et attend votre réponse.`,
        });

        // Transactional email (best-effort)
        if (recipientEmail) {
          try {
            await admin.functions.invoke("send-transactional-email", {
              body: {
                to: recipientEmail,
                subject: `⏰ ${senderName} attend votre réponse sur Nukuconnect`,
                purpose: "transactional",
                idempotency_key: `msg-reminder-${m.id}`,
                html: `
                  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
                    <h2 style="color:#10B981">Vous avez un message non lu</h2>
                    <p>Bonjour,</p>
                    <p><strong>${senderName}</strong> vous a envoyé un message il y a quelques minutes sur Nukuconnect et attend votre réponse :</p>
                    <blockquote style="border-left:3px solid #10B981;padding:8px 12px;color:#374151;background:#F0FDF4">
                      ${(m.content || "").slice(0, 240).replace(/</g, "&lt;")}
                    </blockquote>
                    <p style="margin-top:24px">
                      <a href="https://nukuconnect.com/messages" style="background:#10B981;color:white;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Répondre maintenant</a>
                    </p>
                    <p style="color:#6B7280;font-size:12px;margin-top:32px">Vous recevez ce rappel car un message reste sans réponse depuis plus de 5 minutes. Pour ne plus recevoir ces rappels, désactivez les notifications email dans vos paramètres.</p>
                  </div>
                `,
              },
            });
          } catch (e) {
            console.error("email send failed", e);
          }
        }

        await admin.from("messages").update({ reminder_sent_at: new Date().toISOString() }).eq("id", m.id);
        sent++;
      } catch (e) {
        console.error("reminder error for message", m.id, e);
      }
    }

    return new Response(JSON.stringify({ processed: msgs.length, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-message-reminders fatal", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
