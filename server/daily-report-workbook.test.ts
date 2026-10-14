import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildDailyReportWorkbook } from "../netlify/functions/_lib/daily-report-workbook";

const sample = {
  shopName: "PetFlow Norte",
  reportDate: "2026-10-13",
  timeZone: "America/Argentina/Buenos_Aires",
  sales: [
    { id: "sale-1", created_at: "2026-10-13T15:00:00.000Z", client_name: "Ana", payment_method: "cash", total: "1200.00" },
    { id: "sale-2", created_at: "2026-10-13T16:30:00.000Z", client_name: null, payment_method: "card", total: 800 },
  ],
  items: [
    { sale_id: "sale-1", product_name: "Alimento", quantity: 2, unit_price: 600, line_total: 1200 },
  ],
  appointments: [
    { scheduled_at: "2026-10-13T18:00:00.000Z", client_name: "Ana", pet_name: "Luna", service: "Baño", duration_minutes: 60, status: "confirmed" },
  ],
};

describe("buildDailyReportWorkbook", () => {
  it("genera un XLSX legible con resumen, ventas, artículos y turnos", async () => {
    const buffer = await buildDailyReportWorkbook(sample);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(["Resumen", "Ventas", "Artículos", "Turnos"]);
    expect(workbook.getWorksheet("Resumen")?.getCell("B5").value).toBe(2);
    expect(workbook.getWorksheet("Resumen")?.getCell("B6").value).toBe(2000);
    expect(workbook.getWorksheet("Ventas")?.rowCount).toBe(3);
    expect(workbook.getWorksheet("Artículos")?.getCell("B2").value).toBe("Alimento");
    expect(workbook.getWorksheet("Turnos")?.getCell("C2").value).toBe("Luna");
    expect(workbook.getWorksheet("Ventas")?.getCell("A2").value).toContain("13/10/2026");
  });

  it("rechaza una fecha de cierre que no tenga el formato esperado", async () => {
    await expect(buildDailyReportWorkbook({ ...sample, reportDate: "ayer" })).rejects.toThrow("AAAA-MM-DD");
  });

  it("rechaza importes no numéricos para no publicar un total incompleto", async () => {
    await expect(buildDailyReportWorkbook({ ...sample, sales: [{ ...sample.sales[0], total: "inválido" }] })).rejects.toThrow("Dato numérico inválido");
  });
});
