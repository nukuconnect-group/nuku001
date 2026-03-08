import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderEmailData {
  buyerEmail: string;
  buyerName: string;
  orderItems: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    unit: string;
    sellerName: string;
  }>;
  subtotal: number;
  deliveryPrice: number;
  total: number;
  deliveryMethod: string;
  paymentMethod: string;
  deliveryCity?: string;
  deliveryAddress?: string;
  invoiceNumber: string;
  orderDate: string;
}

const formatCFA = (amount: number) => `${amount.toLocaleString("fr-FR")} FCFA`;

const generateEmailHTML = (data: OrderEmailData) => `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#166534;padding:24px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;">NukuConnect</h1>
            <p style="color:#bbf7d0;margin:4px 0 0;font-size:13px;">Confirmation de commande</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#166534;margin:0 0 8px;font-size:20px;">Merci ${data.buyerName} ! 🎉</h2>
            <p style="color:#71717a;margin:0 0 24px;font-size:14px;line-height:1.6;">
              Votre commande <strong style="color:#166534;">${data.invoiceNumber}</strong> a été enregistrée avec succès le ${data.orderDate}.
            </p>

            <!-- Order Items -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr style="background:#f4f4f5;">
                <td style="padding:10px 16px;font-size:12px;font-weight:bold;color:#71717a;">PRODUIT</td>
                <td style="padding:10px 16px;font-size:12px;font-weight:bold;color:#71717a;text-align:center;">QTÉ</td>
                <td style="padding:10px 16px;font-size:12px;font-weight:bold;color:#71717a;text-align:right;">TOTAL</td>
              </tr>
              ${data.orderItems.map(item => `
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#18181b;border-top:1px solid #e4e4e7;">
                  <strong>${item.name}</strong><br/>
                  <span style="color:#a1a1aa;font-size:11px;">Fournisseur: ${item.sellerName}</span>
                </td>
                <td style="padding:12px 16px;font-size:13px;color:#71717a;text-align:center;border-top:1px solid #e4e4e7;">
                  ${item.quantity} ${item.unit}
                </td>
                <td style="padding:12px 16px;font-size:13px;color:#18181b;text-align:right;font-weight:bold;border-top:1px solid #e4e4e7;">
                  ${formatCFA(item.unitPrice * item.quantity)}
                </td>
              </tr>
              `).join("")}
            </table>

            <!-- Totals -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#71717a;">Sous-total</td>
                <td style="padding:6px 0;font-size:13px;color:#18181b;text-align:right;">${formatCFA(data.subtotal)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#71717a;">Livraison (${data.deliveryMethod})</td>
                <td style="padding:6px 0;font-size:13px;color:#18181b;text-align:right;">${data.deliveryPrice === 0 ? "Gratuit" : formatCFA(data.deliveryPrice)}</td>
              </tr>
              <tr>
                <td colspan="2" style="border-top:2px solid #166534;padding-top:12px;"></td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:18px;font-weight:bold;color:#166534;">TOTAL</td>
                <td style="padding:6px 0;font-size:18px;font-weight:bold;color:#166534;text-align:right;">${formatCFA(data.total)}</td>
              </tr>
            </table>

            <!-- Delivery & Payment Info -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;padding:16px;margin-bottom:24px;">
              <tr>
                <td style="padding:12px 16px;">
                  <p style="margin:0 0 8px;font-size:13px;"><strong>🚚 Livraison:</strong> ${data.deliveryMethod}</p>
                  ${data.deliveryCity ? `<p style="margin:0 0 8px;font-size:13px;">📍 ${data.deliveryCity}${data.deliveryAddress ? `, ${data.deliveryAddress}` : ""}</p>` : ""}
                  <p style="margin:0;font-size:13px;"><strong>💳 Paiement:</strong> ${data.paymentMethod}</p>
                </td>
              </tr>
            </table>

            <p style="color:#71717a;font-size:12px;line-height:1.6;margin:0;">
              Une facture PDF a été générée automatiquement. Vous pouvez la re-télécharger depuis votre tableau de bord → Paiements.
            </p>
          </td>
        </tr>
        <!-- Footer -->
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
    const data: OrderEmailData = await req.json();

    // Use Supabase's built-in email via the auth admin API isn't suitable here
    // Instead, we'll log the email and return success - in production you'd integrate 
    // a transactional email service
    const emailHTML = generateEmailHTML(data);

    console.log(`Order confirmation email prepared for ${data.buyerEmail}`);
    console.log(`Invoice: ${data.invoiceNumber}, Total: ${formatCFA(data.total)}`);

    // For now, return the generated HTML so the frontend can show it
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email de confirmation préparé",
        emailPreview: emailHTML,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error preparing confirmation email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
