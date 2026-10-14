import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Config } from "@netlify/functions";
import { buildDailyReportWorkbook, type DailyReportAppointment, type DailyReportItem, type DailyReportSale } from "./_lib/daily-report-workbook";
import { dateInZone, localDayUtcRange, shiftCalendarDate } from "./_lib/report-dates";

const REPORT_BUCKET = "petflow-daily-reports";
const PAGE_SIZE = 500;

type ShopRow = { id: string; name: string; timezone: string | null; daily_reports_enabled: boolean };
type SaleRow = { id: string; client_id: string | null; payment_method: string; total: string | number; created_at: string };
type ItemRow = { sale_id: string; product_name: string; quantity: string | number; unit_price: string | number; line_total: string | number };
type AppointmentRow = { id: string; client_id: string; pet_id: string; service: string; scheduled_at: string; duration_minutes: number; status: string };
type ClientRow = { id: string; full_name: string };
type PetRow = { id: string; name: string };
type QueryResult<T> = { data: T[] | null; error: { message: string } | null };

async function readAll<T>(loadPage: (from: number, to: number) => PromiseLike<QueryResult<T>>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < 100_000; from += PAGE_SIZE) {
    const { data, error } = await loadPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
  throw new Error("El conjunto supera el límite seguro de filas por reporte.");
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function finiteAmount(value: number | string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("El reporte contiene un importe no numérico.");
  return parsed;
}

async function generateForShop(admin: SupabaseClient<any>, shop: ShopRow, runAt: Date) {
  const timeZone = shop.timezone || "America/Argentina/Buenos_Aires";
  const todayLocal = dateInZone(runAt, timeZone);
  const reportDate = shiftCalendarDate(todayLocal, -1);
  const { data: existing, error: existingError } = await admin
    .from("daily_reports")
    .select("id")
    .eq("pet_shop_id", shop.id)
    .eq("report_date", reportDate)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return "skipped" as const;

  const { start, end } = localDayUtcRange(reportDate, timeZone);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const sales = await readAll<SaleRow>((from, to) => admin
    .from("sales")
    .select("id,client_id,payment_method,total,created_at")
    .eq("pet_shop_id", shop.id)
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .order("created_at", { ascending: true })
    .range(from, to));

  const saleIds = sales.map(sale => sale.id);
  const items: ItemRow[] = [];
  for (const idGroup of chunks(saleIds, 100)) {
    const groupItems = await readAll<ItemRow>((from, to) => admin
      .from("sale_items")
      .select("sale_id,product_name,quantity,unit_price,line_total")
      .eq("pet_shop_id", shop.id)
      .in("sale_id", idGroup)
      .order("sale_id", { ascending: true })
      .range(from, to));
    items.push(...groupItems);
  }

  const appointments = await readAll<AppointmentRow>((from, to) => admin
    .from("appointments")
    .select("id,client_id,pet_id,service,scheduled_at,duration_minutes,status")
    .eq("pet_shop_id", shop.id)
    .gte("scheduled_at", startIso)
    .lt("scheduled_at", endIso)
    .order("scheduled_at", { ascending: true })
    .range(from, to));

  const clientIds = [...new Set([...sales.map(sale => sale.client_id), ...appointments.map(appointment => appointment.client_id)].filter((id): id is string => Boolean(id)))];
  const petIds = [...new Set(appointments.map(appointment => appointment.pet_id).filter(Boolean))];
  const clients: ClientRow[] = [];
  for (const idGroup of chunks(clientIds, 100)) {
    const rows = await readAll<ClientRow>((from, to) => admin
      .from("clients")
      .select("id,full_name")
      .eq("pet_shop_id", shop.id)
      .in("id", idGroup)
      .range(from, to));
    clients.push(...rows);
  }
  const pets: PetRow[] = [];
  for (const idGroup of chunks(petIds, 100)) {
    const rows = await readAll<PetRow>((from, to) => admin
      .from("pets")
      .select("id,name")
      .eq("pet_shop_id", shop.id)
      .in("id", idGroup)
      .range(from, to));
    pets.push(...rows);
  }
  const clientNames = new Map(clients.map(client => [client.id, client.full_name]));
  const petNames = new Map(pets.map(pet => [pet.id, pet.name]));

  const reportSales: DailyReportSale[] = sales.map(sale => ({
    id: sale.id,
    created_at: sale.created_at,
    client_name: sale.client_id ? clientNames.get(sale.client_id) ?? "Cliente" : "Consumidor final",
    payment_method: sale.payment_method,
    total: sale.total,
  }));
  const reportItems: DailyReportItem[] = items.map(item => ({
    sale_id: item.sale_id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.line_total,
  }));
  const reportAppointments: DailyReportAppointment[] = appointments.map(appointment => ({
    scheduled_at: appointment.scheduled_at,
    client_name: clientNames.get(appointment.client_id) ?? "Sin cliente",
    pet_name: petNames.get(appointment.pet_id) ?? "Sin mascota",
    service: appointment.service,
    duration_minutes: appointment.duration_minutes,
    status: appointment.status,
  }));

  const file = await buildDailyReportWorkbook({
    shopName: shop.name,
    reportDate,
    timeZone,
    sales: reportSales,
    items: reportItems,
    appointments: reportAppointments,
  });
  const filePath = `${shop.id}/${reportDate}.xlsx`;
  const { error: uploadError } = await admin.storage.from(REPORT_BUCKET).upload(filePath, file, {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    cacheControl: "0",
    upsert: true,
  });
  if (uploadError) throw new Error(uploadError.message);

  const salesTotal = sales.reduce((sum, sale) => sum + finiteAmount(sale.total), 0);
  const { error: recordError } = await admin.from("daily_reports").upsert({
    pet_shop_id: shop.id,
    report_date: reportDate,
    file_path: filePath,
    sales_count: sales.length,
    appointment_count: appointments.length,
    sales_total: salesTotal,
    generated_at: runAt.toISOString(),
  }, { onConflict: "pet_shop_id,report_date" });
  if (recordError) throw new Error(recordError.message);

  return "generated" as const;
}

export default async (request: Request) => {
  const supabaseUrl = Netlify.env.get("SUPABASE_URL");
  const serviceRoleKey = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Daily report generation requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the Netlify Functions scope.");
    return Response.json({ error: "Report function is missing its private Supabase runtime configuration." }, { status: 500 });
  }

  const runAt = new Date();

  const admin = createClient<any>(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: shops, error: shopsError } = await admin
    .from("pet_shops")
    .select("id,name,timezone,daily_reports_enabled")
    .eq("daily_reports_enabled", true);
  if (shopsError) {
    console.error("Daily report scheduler could not load enabled shops.", shopsError.message);
    return Response.json({ error: "Unable to load report settings." }, { status: 500 });
  }

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  for (const shop of (shops ?? []) as ShopRow[]) {
    try {
      const result = await generateForShop(admin, shop, runAt);
      if (result === "generated") generated += 1;
      else skipped += 1;
    } catch (error) {
      failed += 1;
      console.error("Daily report generation failed for shop", shop.id, error instanceof Error ? error.message : "Unknown error");
    }
  }

  console.info("Daily report schedule finished.", { generated, skipped, failed });
  return Response.json({ generated, skipped, failed }, { status: failed ? 500 : 200 });
};

export const config: Config = {
  // Every hour at minute 0 UTC. Each run calculates the previous calendar day in each shop's own timezone.
  schedule: "0 * * * *",
};
