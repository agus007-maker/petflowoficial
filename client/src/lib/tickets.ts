"use client";

import { jsPDF } from "jspdf";
import { ticketFilename } from "@/lib/petflow-rules";

type TicketLine = { product_name: string; quantity: number; unit_price: number | string; line_total: number | string };
type Ticket = { id: string; created_at: string; payment_method: string; total: number | string; items: TicketLine[]; client?: { full_name?: string | null } | null };

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

export function downloadTicketPdf(ticket: Ticket, shopName: string) {
  const pdf = new jsPDF({ unit: "mm", format: [80, 180] });
  const id = ticket.id.slice(0, 8).toUpperCase();
  let y = 10;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text(shopName, 40, y, { align: "center" });
  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`Ticket #${id}`, 40, y, { align: "center" });
  y += 5;
  pdf.text(new Date(ticket.created_at).toLocaleString("es-AR"), 40, y, { align: "center" });
  y += 7;
  pdf.line(6, y, 74, y);
  y += 5;
  ticket.items.forEach(item => {
    const label = `${item.quantity} × ${item.product_name}`.slice(0, 43);
    pdf.text(label, 6, y);
    y += 4;
    pdf.text(money.format(Number(item.unit_price)), 6, y);
    pdf.text(money.format(Number(item.line_total)), 74, y, { align: "right" });
    y += 5;
  });
  pdf.line(6, y, 74, y);
  y += 7;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("TOTAL", 6, y);
  pdf.text(money.format(Number(ticket.total)), 74, y, { align: "right" });
  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`Pago: ${paymentLabel(ticket.payment_method)}`, 6, y);
  y += 5;
  if (ticket.client?.full_name) pdf.text(`Cliente: ${ticket.client.full_name}`.slice(0, 45), 6, y);
  pdf.save(ticketFilename(ticket.id));
}

export function printTicket(ticket: Ticket, shopName: string) {
  const receipt = window.open("", "_blank", "width=480,height=720");
  if (!receipt) return;
  receipt.document.write(`<!doctype html><html><head><title>Ticket</title><style>body{font:14px system-ui;max-width:320px;margin:24px auto;color:#142e28}h1{text-align:center;font-size:21px}.muted{text-align:center;color:#66756e}.line{border-top:1px dashed #9eaaa5;margin:14px 0}.item{display:flex;justify-content:space-between;gap:10px;margin:9px 0}.total{font-size:20px;font-weight:800}@media print{body{margin:0}}</style></head><body><h1>${shopName}</h1><p class="muted">Ticket #${ticket.id.slice(0, 8).toUpperCase()}<br>${new Date(ticket.created_at).toLocaleString("es-AR")}</p><div class="line"></div>${ticket.items.map(item => `<div class="item"><span>${item.quantity} × ${item.product_name}</span><strong>${money.format(Number(item.line_total))}</strong></div>`).join("")}<div class="line"></div><div class="item total"><span>Total</span><span>${money.format(Number(ticket.total))}</span></div><p>Pago: ${paymentLabel(ticket.payment_method)}<br>${ticket.client?.full_name ? `Cliente: ${ticket.client.full_name}` : "Venta sin asociar"}</p><script>window.print()</script></body></html>`);
  receipt.document.close();
}

export function paymentLabel(method: string) {
  return ({ cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", other: "Otro" } as Record<string, string>)[method] ?? method;
}
