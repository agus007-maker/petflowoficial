import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const sourcePath = process.argv[2];
const ownerUserId = process.env.IMPORT_OWNER_USER_ID;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!sourcePath || !ownerUserId || !url || !serviceKey) {
  console.error("Uso: IMPORT_OWNER_USER_ID=<uuid de auth.users> pnpm import:legacy <archivo.json>");
  process.exit(1);
}

const input = JSON.parse(await readFile(sourcePath, "utf8"));
const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const oldId = value => String(value);
const required = (value, message) => { if (!value) throw new Error(message); return value; };

async function insert(table, rows) {
  if (!rows.length) return [];
  const { data, error } = await supabase.from(table).insert(rows).select();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

try {
  const { petShop = {}, products = [], clients = [], pets = [], sales = [], saleItems = [], appointments = [], notifications = [], notificationSettings } = input;
  const shop = (await insert("pet_shops", [{
    name: required(petShop.name, "El export debe contener petShop.name"),
    timezone: petShop.timezone || "America/Argentina/Buenos_Aires",
    owner_user_id: ownerUserId,
  }]))[0];
  const clientRows = await insert("clients", clients.map(item => ({ pet_shop_id: shop.id, full_name: item.fullName ?? item.full_name, phone: item.phone || null, email: item.email || null, notes: item.notes || null, created_at: item.createdAt ?? item.created_at }))); 
  const clientIds = new Map(clients.map((item, index) => [oldId(item.id), clientRows[index].id]));
  const productRows = await insert("products", products.map(item => ({ pet_shop_id: shop.id, name: item.name, sku: item.sku || null, category: item.category, stock: Number(item.stock), min_stock: Number(item.minStock ?? item.min_stock ?? 3), cost_price: Number(item.costPrice ?? item.cost_price ?? 0), sale_price: Number(item.salePrice ?? item.sale_price), active: item.active ?? true, created_at: item.createdAt ?? item.created_at }))); 
  const productIds = new Map(products.map((item, index) => [oldId(item.id), productRows[index].id]));
  const petRows = await insert("pets", pets.map(item => ({ pet_shop_id: shop.id, client_id: required(clientIds.get(oldId(item.clientId ?? item.client_id)), `Cliente legado ausente para mascota ${item.name}`), name: item.name, species: item.species, breed: item.breed || null, notes: item.notes || null, created_at: item.createdAt ?? item.created_at }))); 
  const petIds = new Map(pets.map((item, index) => [oldId(item.id), petRows[index].id]));
  const saleRows = await insert("sales", sales.map(item => ({ pet_shop_id: shop.id, client_id: item.clientId || item.client_id ? clientIds.get(oldId(item.clientId ?? item.client_id)) : null, payment_method: item.paymentMethod ?? item.payment_method, total: Number(item.total), created_at: item.createdAt ?? item.created_at }))); 
  const saleIds = new Map(sales.map((item, index) => [oldId(item.id), saleRows[index].id]));
  await insert("sale_items", saleItems.map(item => ({ pet_shop_id: shop.id, sale_id: required(saleIds.get(oldId(item.saleId ?? item.sale_id)), "Venta legado ausente"), product_id: item.productId || item.product_id ? productIds.get(oldId(item.productId ?? item.product_id)) || null : null, product_name: item.productName ?? item.product_name, unit_price: Number(item.unitPrice ?? item.unit_price), quantity: Number(item.quantity), line_total: Number(item.lineTotal ?? item.line_total) })));
  await insert("appointments", appointments.map(item => ({ pet_shop_id: shop.id, client_id: required(clientIds.get(oldId(item.clientId ?? item.client_id)), "Cliente legado ausente en turno"), pet_id: required(petIds.get(oldId(item.petId ?? item.pet_id)), "Mascota legado ausente en turno"), service: item.service, scheduled_at: item.scheduledAt ?? item.scheduled_at, duration_minutes: Number(item.durationMinutes ?? item.duration_minutes ?? 60), status: item.status ?? "scheduled", notes: item.notes || null, reminder_sent_at: item.reminderSentAt ?? item.reminder_sent_at ?? null, created_at: item.createdAt ?? item.created_at }))); 
  if (notificationSettings) await supabase.from("notification_settings").upsert({ pet_shop_id: shop.id, reminders_enabled: notificationSettings.remindersEnabled ?? notificationSettings.reminders_enabled ?? true, reminder_lead_minutes: Number(notificationSettings.reminderLeadMinutes ?? notificationSettings.reminder_lead_minutes ?? 60) });
  await insert("notifications", notifications.map(item => ({ pet_shop_id: shop.id, type: item.type, title: item.title, content: item.content, read_at: item.readAt ?? item.read_at ?? null, created_at: item.createdAt ?? item.created_at })));
  console.log(JSON.stringify({ ok: true, petShopId: shop.id, imported: { products: productRows.length, clients: clientRows.length, pets: petRows.length, sales: saleRows.length } }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
