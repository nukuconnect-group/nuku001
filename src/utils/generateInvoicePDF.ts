import jsPDF from "jspdf";

interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  sellerName: string;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  buyerName: string;
  buyerPhone?: string;
  deliveryMethod: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryPrice: number;
  paymentMethod: string;
  mobileNumber?: string;
  items: InvoiceItem[];
  subtotal: number;
  total: number;
}

const formatCFA = (amount: number) => `${amount.toLocaleString("en-US")} FCFA`;

export const generateInvoicePDF = (data: InvoiceData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // --- Header ---
  doc.setFillColor(22, 101, 52); // primary green
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("NukuConnect", 15, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Marketplace Agricole du Togo", 15, 26);
  doc.text("www.nukuconnect.com", 15, 33);

  // Invoice title right side
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURE", pageWidth - 15, 18, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`N° ${data.invoiceNumber}`, pageWidth - 15, 26, { align: "right" });
  doc.text(`Date: ${data.date}`, pageWidth - 15, 33, { align: "right" });

  y = 52;

  // --- Buyer Info ---
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Facturé à:", 15, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(data.buyerName || "Client", 15, y);
  y += 5;
  if (data.buyerPhone) {
    doc.text(`Tél: ${data.buyerPhone}`, 15, y);
    y += 5;
  }

  // Delivery info right
  let yRight = 52;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Livraison:", pageWidth - 80, yRight);
  yRight += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(data.deliveryMethod, pageWidth - 80, yRight);
  yRight += 5;
  if (data.deliveryCity) {
    doc.text(data.deliveryCity, pageWidth - 80, yRight);
    yRight += 5;
  }
  if (data.deliveryAddress) {
    doc.text(data.deliveryAddress, pageWidth - 80, yRight);
    yRight += 5;
  }

  y = Math.max(y, yRight) + 8;

  // --- Separator ---
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // --- Table Header ---
  doc.setFillColor(245, 245, 245);
  doc.rect(15, y - 5, pageWidth - 30, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Produit", 18, y);
  doc.text("Vendeur", 80, y);
  doc.text("Qté", 125, y, { align: "center" });
  doc.text("Prix unit.", 148, y, { align: "right" });
  doc.text("Total", pageWidth - 18, y, { align: "right" });
  y += 10;

  // --- Items ---
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);

  for (const item of data.items) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.text(item.name.substring(0, 30), 18, y);
    doc.text(item.sellerName.substring(0, 20), 80, y);
    doc.text(`${item.quantity} ${item.unit}`, 125, y, { align: "center" });
    doc.text(formatCFA(item.unitPrice), 148, y, { align: "right" });
    doc.text(formatCFA(item.unitPrice * item.quantity), pageWidth - 18, y, { align: "right" });
    y += 7;

    // light row separator
    doc.setDrawColor(230, 230, 230);
    doc.line(18, y - 2, pageWidth - 18, y - 2);
  }

  y += 5;

  // --- Totals ---
  doc.setDrawColor(200, 200, 200);
  doc.line(120, y, pageWidth - 15, y);
  y += 8;

  doc.setFontSize(10);
  doc.text("Sous-total:", 120, y);
  doc.text(formatCFA(data.subtotal), pageWidth - 18, y, { align: "right" });
  y += 7;

  doc.text("Livraison:", 120, y);
  doc.text(data.deliveryPrice === 0 ? "Gratuit" : formatCFA(data.deliveryPrice), pageWidth - 18, y, { align: "right" });
  y += 7;

  doc.setDrawColor(22, 101, 52);
  doc.setLineWidth(0.5);
  doc.line(120, y, pageWidth - 15, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(22, 101, 52);
  doc.text("TOTAL:", 120, y);
  doc.text(formatCFA(data.total), pageWidth - 18, y, { align: "right" });
  y += 12;

  // --- Payment info ---
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Mode de paiement: ${data.paymentMethod}`, 15, y);
  if (data.mobileNumber) {
    y += 5;
    doc.text(`Numéro: ${data.mobileNumber}`, 15, y);
  }

  // --- Footer ---
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text("NukuConnect — Marketplace Agricole du Togo", pageWidth / 2, footerY, { align: "center" });
  doc.text("Merci pour votre confiance !", pageWidth / 2, footerY + 5, { align: "center" });

  // Save
  doc.save(`Facture_${data.invoiceNumber}.pdf`);
};

export const generateOrderInvoice = (
  items: Array<{ product: { id: string; name: string; price: number; unit: string; producer: { name: string } }; quantity: number }>,
  subtotal: number,
  deliveryPrice: number,
  total: number,
  deliveryMethodName: string,
  paymentMethodName: string,
  buyerName?: string,
  buyerPhone?: string,
  deliveryCity?: string,
  deliveryAddress?: string,
  mobileNumber?: string,
) => {
  const now = new Date();
  const invoiceNumber = `NK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

  generateInvoicePDF({
    invoiceNumber,
    date: now.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
    buyerName: buyerName || "Client",
    buyerPhone,
    deliveryMethod: deliveryMethodName,
    deliveryAddress,
    deliveryCity,
    deliveryPrice,
    paymentMethod: paymentMethodName,
    mobileNumber,
    items: items.map((item) => ({
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: item.product.price,
      unit: item.product.unit,
      sellerName: item.product.producer.name,
    })),
    subtotal,
    total,
  });
};
