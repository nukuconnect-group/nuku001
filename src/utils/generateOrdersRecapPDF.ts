import jsPDF from "jspdf";

export interface OrderRecapItem {
  id: string;
  productName: string;
  quantity: number;
  unit?: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  deliveryStatus?: string | null;
  deliveredAt?: string | null;
  sellerName?: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmee",
  processing: "En preparation",
  shipped: "Expediee",
  completed: "Terminee",
  cancelled: "Annulee",
};

const DELIVERY_LABEL: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptee",
  picked_up: "Recuperee",
  in_transit: "En transit",
  delivered: "Livree",
  cancelled: "Annulee",
};

const formatCFA = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR") : "—";

export const generateOrdersRecapPDF = (opts: {
  buyerName: string;
  orders: OrderRecapItem[];
}) => {
  const { buyerName, orders } = opts;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  // Header
  doc.setFillColor(34, 139, 87);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Nukuconnect", margin, 12);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Recapitulatif de commandes", margin, 20);

  y = 36;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`Acheteur : ${buyerName}`, margin, y);
  doc.text(
    `Genere le : ${new Date().toLocaleString("fr-FR")}`,
    pageWidth - margin,
    y,
    { align: "right" },
  );
  y += 5;
  doc.text(`Total commandes : ${orders.length}`, margin, y);
  const totalAmount = orders.reduce((s, o) => s + Number(o.totalPrice || 0), 0);
  doc.text(
    `Montant total : ${formatCFA(totalAmount)}`,
    pageWidth - margin,
    y,
    { align: "right" },
  );
  y += 8;

  // Table header
  const drawTableHeader = () => {
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, pageWidth - 2 * margin, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("N°", margin + 2, y + 5);
    doc.text("Produit", margin + 18, y + 5);
    doc.text("Qte", margin + 78, y + 5);
    doc.text("Montant", margin + 92, y + 5);
    doc.text("Statut", margin + 118, y + 5);
    doc.text("Livraison", margin + 145, y + 5);
    doc.text("Date livr.", margin + 172, y + 5);
    y += 8;
    doc.setFont("helvetica", "normal");
  };

  drawTableHeader();

  doc.setFontSize(8);
  for (const o of orders) {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = margin;
      drawTableHeader();
    }
    const productName = (o.productName || "—").slice(0, 30);
    doc.text(o.id.slice(0, 8).toUpperCase(), margin + 2, y + 4);
    doc.text(productName, margin + 18, y + 4);
    doc.text(`${o.quantity}${o.unit ? " " + o.unit : ""}`, margin + 78, y + 4);
    doc.text(formatCFA(Number(o.totalPrice || 0)), margin + 92, y + 4);
    doc.text(STATUS_LABEL[o.status] || o.status, margin + 118, y + 4);
    doc.text(
      o.deliveryStatus ? DELIVERY_LABEL[o.deliveryStatus] || o.deliveryStatus : "—",
      margin + 145,
      y + 4,
    );
    doc.text(formatDate(o.deliveredAt), margin + 172, y + 4);
    y += 6;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, pageWidth - margin, y);
    y += 1;
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Nukuconnect SA — Page ${i}/${pages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" },
    );
  }

  doc.save(`commandes-nukuconnect-${new Date().toISOString().slice(0, 10)}.pdf`);
};
