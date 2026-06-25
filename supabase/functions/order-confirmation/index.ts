import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OrderItemSchema = z.object({
  name: z.string().min(1).max(255),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  unit: z.string().min(1).max(50),
  sellerName: z.string().min(1).max(255),
});

const BodySchema = z.object({
  buyerEmail: z.string().email().max(255),
  buyerName: z.string().min(1).max(255),
  orderItems: z.array(OrderItemSchema).min(1).max(100),
  subtotal: z.number().nonnegative(),
  deliveryPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
  deliveryMethod: z.string().min(1).max(100),
  paymentMethod: z.string().min(1).max(100),
  deliveryCity: z.string().max(255).optional(),
  deliveryAddress: z.string().max(500).optional(),
  invoiceNumber: z.string().min(1).max(100),
  orderDate: z.string().min(1).max(50),
});

const formatCFA = (amount: number) => `${amount.toLocaleString("fr-FR")} FCFA`;

const escapeHtml = (str: string) =>
  str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const generateEmailHTML = (data: z.infer<typeof BodySchema>) => `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:#166534;padding:24px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;">NukuConnect</h1>
            <p style="color:#bbf7d0;margin:4px 0 0;font-size:13px;">Confirmation de commande</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#166534;margin:0 0 8px;font-size:20px;">Merci ${escapeHtml(data.buyerName)} ! 🎉</h2>
            <p style="color:#71717a;margin:0 0 24px;font-size:14px;line-height:1.6;">
              Votre commande <strong style="color:#166534;">${escapeHtml(data.invoiceNumber)}</strong> a été enregistrée avec succès le ${escapeHtml(data.orderDate)}.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr style="background:#f4f4f5;">
                <td style="padding:10px 16px;font-size:12px;font-weight:bold;color:#71717a;">PRODUIT</td>
                <td style="padding:10px 16px;font-size:12px;font-weight:bold;color:#71717a;text-align:center;">QTÉ</td>
                <td style="padding:10px 16px;font-size:12px;font-weight:bold;color:#71717a;text-align:right;">TOTAL</td>
              </tr>
              ${data.orderItems.map(item => `
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#18181b;border-top:1px solid #e4e4e7;">
                  <strong>${escapeHtml(item.name)}</strong><br/>
                  <span style="color:#a1a1aa;font-size:11px;">Fournisseur: ${escapeHtml(item.sellerName)}</span>
                </td>
                <td style="padding:12px 16px;font-size:13px;color:#71717a;text-align:center;border-top:1px solid #e4e4e7;">
                  ${item.quantity} ${escapeHtml(item.unit)}
                </td>
                <td style="padding:12px 16px;font-size:13px;color:#18181b;text-align:right;font-weight:bold;border-top:1px solid #e4e4e7;">
                  ${formatCFA(item.unitPrice * item.quantity)}
                </td>
              </tr>
              `).join("")}
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#71717a;">Sous-total</td>
                <td style="padding:6px 0;font-size:13px;color:#18181b;text-align:right;">${formatCFA(data.subtotal)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#71717a;">Livraison (${escapeHtml(data.deliveryMethod)})</td>
                <td style="padding:6px 0;font-size:13px;color:#18181b;text-align:right;">${data.deliveryPrice === 0 ? "Gratuit" : formatCFA(data.deliveryPrice)}</td>
              </tr>
              <tr><td colspan="2" style="border-top:2px solid #166534;padding-top:12px;"></td></tr>
              <tr>
                <td style="padding:6px 0;font-size:18px;font-weight:bold;color:#166534;">TOTAL</td>
                <td style="padding:6px 0;font-size:18px;font-weight:bold;color:#166534;text-align:right;">${formatCFA(data.total)}</td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;padding:16px;margin-bottom:24px;">
              <tr>
                <td style="padding:12px 16px;">
                  <p style="margin:0 0 8px;font-size:13px;"><strong>🚚 Livraison:</strong> ${escapeHtml(data.deliveryMethod)}</p>
                  ${data.deliveryCity ? `<p style="margin:0 0 8px;font-size:13px;">📍 ${escapeHtml(data.deliveryCity)}${data.deliveryAddress ? `, ${escapeHtml(data.deliveryAddress)}` : ""}</p>` : ""}
                  <p style="margin:0;font-size:13px;"><strong>💳 Paiement:</strong> ${escapeHtml(data.paymentMethod)}</p>
                </td>
              </tr>
            </table>
            <p style="color:#71717a;font-size:12px;line-height:1.6;margin:0;">
              Une facture PDF a été générée automatiquement. Vous pouvez la re-télécharger depuis votre tableau de bord.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f4f4f5;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#a1a1aa;">NukuConnect — Marketplace Agricole du Togo</p>
            <p style="margin:4px 0 0;font-size:11px;color:#a1a1aa;">Merci pour votre confiance !</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ success: false, error: "Données invalides", details: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const data = parsed.data;
    // Backward-compatible wrapper: keep the legacy endpoint alive, but route
    // through NukuConnect app emails so purchases use the verified sender,
    // retry queue and email logs instead of a third-party direct API.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "order-confirmation",
        recipientEmail: data.buyerEmail,
        idempotencyKey: `order-confirmation-${data.invoiceNumber}-${data.buyerEmail}`,
        templateData: data,
      },
    });
    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email de confirmation ajouté à la file d'envoi",
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error("Error sending confirmation email:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
