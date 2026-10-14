import ExcelJS from "exceljs";

export type DailyReportSale = {
  id: string;
  created_at: string;
  client_name?: string | null;
  payment_method: string;
  total: number | string;
};

export type DailyReportItem = {
  sale_id: string;
  product_name: string;
  quantity: number | string;
  unit_price: number | string;
  line_total: number | string;
};

export type DailyReportAppointment = {
  scheduled_at: string;
  client_name?: string | null;
  pet_name?: string | null;
  service: string;
  duration_minutes: number | string;
  status: string;
};

export type DailyReportData = {
  shopName: string;
  reportDate: string;
  timeZone: string;
  sales: DailyReportSale[];
  items: DailyReportItem[];
  appointments: DailyReportAppointment[];
};

function amount(value: number | string, fieldName: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Dato numérico inválido en ${fieldName}; no se puede generar el reporte.`);
  return parsed;
}

function localDateTime(value: string, timeZone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("El reporte contiene una fecha inválida.");
  return new Intl.DateTimeFormat("es-AR", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FF173F34" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCEFE4" } };
  row.alignment = { vertical: "middle" };
  row.height = 22;
}

function setTableSheet(workbook: ExcelJS.Workbook, name: string, headers: string[], rows: Array<Array<string | number>>, widths: number[]) {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(headers);
  styleHeader(sheet.getRow(1));
  for (const row of rows) sheet.addRow(row);
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  return sheet;
}

export async function buildDailyReportWorkbook(data: DailyReportData): Promise<Buffer> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.reportDate)) throw new Error("La fecha del reporte debe tener formato AAAA-MM-DD.");
  // Validate the timezone up front, rather than silently writing a report with the wrong business day.
  new Intl.DateTimeFormat("es-AR", { timeZone: data.timeZone }).format(new Date());

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PetFlow";
  workbook.subject = `Cierre diario ${data.reportDate}`;
  workbook.created = new Date();
  workbook.modified = new Date();

  const salesTotal = data.sales.reduce((sum, sale) => sum + amount(sale.total, "total de venta"), 0);
  const paymentTotals = new Map<string, { count: number; total: number }>();
  for (const sale of data.sales) {
    const key = sale.payment_method || "Sin especificar";
    const current = paymentTotals.get(key) ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += amount(sale.total, "total de venta");
    paymentTotals.set(key, current);
  }

  const summary = workbook.addWorksheet("Resumen");
  summary.addRows([
    ["PetFlow · Reporte diario"],
    ["Negocio", data.shopName],
    ["Fecha del cierre", data.reportDate],
    ["Zona horaria", data.timeZone],
    ["Cantidad de ventas", data.sales.length],
    ["Facturación total (ARS)", salesTotal],
    ["Ticket promedio (ARS)", data.sales.length ? salesTotal / data.sales.length : 0],
    [],
    ["Medio de pago", "Operaciones", "Total (ARS)"],
  ]);
  summary.getRow(1).font = { bold: true, size: 16, color: { argb: "FF173F34" } };
  styleHeader(summary.getRow(9));
  for (const [method, totals] of [...paymentTotals.entries()].sort(([a], [b]) => a.localeCompare(b, "es"))) {
    summary.addRow([method, totals.count, totals.total]);
  }
  summary.getColumn(1).width = 31;
  summary.getColumn(2).width = 24;
  summary.getColumn(3).width = 20;
  summary.getCell("B6").numFmt = '"$" #,##0.00';
  summary.getCell("B7").numFmt = '"$" #,##0.00';
  for (let row = 10; row <= summary.rowCount; row += 1) summary.getCell(`C${row}`).numFmt = '"$" #,##0.00';
  summary.views = [{ state: "frozen", ySplit: 9 }];

  const salesRows = data.sales.map(sale => [
    localDateTime(sale.created_at, data.timeZone),
    sale.id,
    sale.client_name || "Consumidor final",
    sale.payment_method || "Sin especificar",
    amount(sale.total, "total de venta"),
  ]);
  const salesSheet = setTableSheet(workbook, "Ventas", ["Fecha y hora local", "ID de venta", "Cliente", "Medio de pago", "Total (ARS)"], salesRows, [23, 38, 30, 22, 19]);
  for (let row = 2; row <= salesSheet.rowCount; row += 1) salesSheet.getCell(`E${row}`).numFmt = '"$" #,##0.00';

  const itemRows = data.items.map(item => [
    item.sale_id,
    item.product_name,
    amount(item.quantity, "cantidad"),
    amount(item.unit_price, "precio unitario"),
    amount(item.line_total, "subtotal de artículo"),
  ]);
  const itemsSheet = setTableSheet(workbook, "Artículos", ["ID de venta", "Producto", "Cantidad", "Precio unitario (ARS)", "Subtotal (ARS)"], itemRows, [38, 34, 14, 23, 20]);
  for (let row = 2; row <= itemsSheet.rowCount; row += 1) {
    itemsSheet.getCell(`D${row}`).numFmt = '"$" #,##0.00';
    itemsSheet.getCell(`E${row}`).numFmt = '"$" #,##0.00';
  }

  const appointmentRows = data.appointments.map(appointment => [
    localDateTime(appointment.scheduled_at, data.timeZone),
    appointment.client_name || "Sin cliente",
    appointment.pet_name || "Sin mascota",
    appointment.service,
    amount(appointment.duration_minutes, "duración del turno"),
    appointment.status,
  ]);
  setTableSheet(workbook, "Turnos", ["Fecha y hora local", "Cliente", "Mascota", "Servicio", "Duración (min)", "Estado"], appointmentRows, [23, 28, 24, 30, 18, 18]);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
