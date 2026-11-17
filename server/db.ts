import { and, asc, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { TRPCError } from "@trpc/server";
import {
  appointments,
  clients,
  type InsertUser,
  notificationSettings,
  notifications,
  membershipPermissions,
  shopMemberships,
  pets,
  products,
  saleItems,
  sales,
  type User,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { buildSaleLines, petBelongsToClient, PetShopRuleError } from "./petshopRules";

type AppDb = ReturnType<typeof drizzle>;
let _sql: ReturnType<typeof postgres> | null = null;
let _db: AppDb | null = null;

export async function getDb() {
  const connectionString = ENV.supabaseDatabaseUrl || ENV.databaseUrl;
  if (!_db && connectionString) {
    try {
      // Supabase's pooler is compatible with postgres-js when prepared statements are disabled.
      _sql = postgres(connectionString, { prepare: false, max: 5, connect_timeout: 10, idle_timeout: 20 });
      _db = drizzle(_sql);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _sql = null;
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La base de datos no está disponible." });
  }
  return db;
}

export async function closeDb() {
  if (_sql) {
    await _sql.end({ timeout: 5 });
    _sql = null;
    _db = null;
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn, updatedAt: new Date() };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function listProducts(ownerUserId: number) {
  const db = await requireDb();
  return db.select().from(products).where(and(eq(products.ownerUserId, ownerUserId), eq(products.active, true))).orderBy(asc(products.name));
}

export async function createProduct(ownerUserId: number, input: {
  name: string; sku?: string | null; category: string; stock: number; minStock: number; costPrice: number; salePrice: number;
}) {
  const db = await requireDb();
  await db.insert(products).values({
    ownerUserId,
    name: input.name,
    sku: input.sku || null,
    category: input.category,
    stock: input.stock,
    minStock: input.minStock,
    costPrice: input.costPrice.toFixed(2),
    salePrice: input.salePrice.toFixed(2),
  });
}

export async function changeProductStock(ownerUserId: number, productId: number, adjustment: number) {
  const db = await requireDb();
  const product = (await db.select().from(products).where(and(eq(products.id, productId), eq(products.ownerUserId, ownerUserId))).limit(1))[0];
  if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Producto no encontrado." });
  const nextStock = product.stock + adjustment;
  if (nextStock < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "El stock no puede ser negativo." });
  await db.update(products).set({ stock: nextStock, updatedAt: new Date() }).where(eq(products.id, productId));
  return nextStock;
}

export async function listClients(ownerUserId: number) {
  const db = await requireDb();
  const rows = await db.select().from(clients).where(eq(clients.ownerUserId, ownerUserId)).orderBy(asc(clients.fullName));
  const petRows = await db.select().from(pets).where(eq(pets.ownerUserId, ownerUserId)).orderBy(asc(pets.name));
  return rows.map(client => ({ ...client, pets: petRows.filter(pet => pet.clientId === client.id) }));
}

export async function createClient(ownerUserId: number, input: { fullName: string; phone?: string | null; email?: string | null; notes?: string | null }) {
  const db = await requireDb();
  const [client] = await db.insert(clients).values({ ownerUserId, ...input, phone: input.phone || null, email: input.email || null, notes: input.notes || null }).returning({ id: clients.id });
  return client.id;
}

export async function addPet(ownerUserId: number, input: { clientId: number; name: string; species: string; breed?: string | null; notes?: string | null }) {
  const db = await requireDb();
  const client = (await db.select({ id: clients.id }).from(clients).where(and(eq(clients.id, input.clientId), eq(clients.ownerUserId, ownerUserId))).limit(1))[0];
  if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado." });
  await db.insert(pets).values({ ownerUserId, ...input, breed: input.breed || null, notes: input.notes || null });
}

export async function getClientDetail(ownerUserId: number, clientId: number) {
  const db = await requireDb();
  const client = (await db.select().from(clients).where(and(eq(clients.id, clientId), eq(clients.ownerUserId, ownerUserId))).limit(1))[0];
  if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado." });
  const clientPets = await db.select().from(pets).where(and(eq(pets.clientId, clientId), eq(pets.ownerUserId, ownerUserId))).orderBy(asc(pets.name));
  const clientSales = await db.select().from(sales).where(and(eq(sales.clientId, clientId), eq(sales.ownerUserId, ownerUserId))).orderBy(desc(sales.createdAt));
  return { client, pets: clientPets, sales: clientSales };
}

export async function listAppointments(ownerUserId: number, day?: Date) {
  const db = await requireDb();
  const conditions = [eq(appointments.ownerUserId, ownerUserId)];
  if (day) {
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    conditions.push(gte(appointments.scheduledAt, start), lte(appointments.scheduledAt, end));
  }
  return db.select({
    appointment: appointments,
    clientName: clients.fullName,
    clientPhone: clients.phone,
    petName: pets.name,
    petSpecies: pets.species,
  }).from(appointments)
    .innerJoin(clients, eq(appointments.clientId, clients.id))
    .innerJoin(pets, eq(appointments.petId, pets.id))
    .where(and(...conditions))
    .orderBy(asc(appointments.scheduledAt));
}

export async function createAppointment(ownerUserId: number, input: { clientId: number; petId: number; service: string; scheduledAt: Date; durationMinutes: number; notes?: string | null }) {
  const db = await requireDb();
  const [client, pet] = await Promise.all([
    db.select({ id: clients.id }).from(clients).where(and(eq(clients.id, input.clientId), eq(clients.ownerUserId, ownerUserId))).limit(1),
    db.select({ id: pets.id, clientId: pets.clientId }).from(pets).where(and(eq(pets.id, input.petId), eq(pets.ownerUserId, ownerUserId))).limit(1),
  ]);
  if (!client[0] || !pet[0] || !petBelongsToClient(pet[0].clientId, input.clientId)) throw new TRPCError({ code: "BAD_REQUEST", message: "La mascota no pertenece al cliente seleccionado." });
  await db.insert(appointments).values({ ...input, ownerUserId, notes: input.notes || null });
}

export async function getAppointment(ownerUserId: number, appointmentId: number) {
  const db = await requireDb();
  return (await db.select({ appointment: appointments, clientName: clients.fullName, petName: pets.name })
    .from(appointments).innerJoin(clients, eq(appointments.clientId, clients.id)).innerJoin(pets, eq(appointments.petId, pets.id))
    .where(and(eq(appointments.id, appointmentId), eq(appointments.ownerUserId, ownerUserId))).limit(1))[0];
}

export async function updateAppointmentStatus(ownerUserId: number, appointmentId: number, status: typeof appointments.$inferInsert.status) {
  const db = await requireDb();
  await db.update(appointments).set({ status, updatedAt: new Date() }).where(and(eq(appointments.id, appointmentId), eq(appointments.ownerUserId, ownerUserId)));
}

export async function createSale(ownerUserId: number, input: { clientId?: number | null; paymentMethod: "cash" | "card" | "transfer" | "other"; items: { productId: number; quantity: number }[] }) {
  const db = await requireDb();
  const uniqueIds = Array.from(new Set(input.items.map(item => item.productId)));

  return db.transaction(async tx => {
    if (input.clientId) {
      const client = (await tx.select({ id: clients.id }).from(clients).where(and(eq(clients.id, input.clientId), eq(clients.ownerUserId, ownerUserId))).limit(1))[0];
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado." });
    }
    const currentProducts = await tx.select().from(products).where(and(eq(products.ownerUserId, ownerUserId), inArray(products.id, uniqueIds)));
    let preparedSale: ReturnType<typeof buildSaleLines>;
    try {
      preparedSale = buildSaleLines(input.items, currentProducts);
    } catch (error) {
      if (error instanceof PetShopRuleError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      throw error;
    }
    const { lines, total } = preparedSale;
    const [sale] = await tx.insert(sales).values({ ownerUserId, clientId: input.clientId || null, paymentMethod: input.paymentMethod, total: total.toFixed(2) }).returning({ id: sales.id });
    if (!sale?.id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo registrar la venta." });
    await tx.insert(saleItems).values(lines.map(line => ({ saleId: sale.id, productId: line.product.id, productName: line.product.name, unitPrice: line.unitPrice.toFixed(2), quantity: line.quantity, lineTotal: line.lineTotal.toFixed(2) })));
    for (const line of lines) {
      await tx.update(products).set({ stock: line.product.stock - line.quantity, updatedAt: new Date() }).where(and(eq(products.id, line.product.id), eq(products.ownerUserId, ownerUserId)));
    }
    return { saleId: sale.id, total };
  });
}

export async function getDashboard(ownerUserId: number) {
  const db = await requireDb();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const [allProducts, todaySales, todayAppointments, recentSales, unreadNotifications] = await Promise.all([
    db.select().from(products).where(and(eq(products.ownerUserId, ownerUserId), eq(products.active, true))),
    db.select().from(sales).where(and(eq(sales.ownerUserId, ownerUserId), gte(sales.createdAt, dayStart), lte(sales.createdAt, dayEnd))),
    listAppointments(ownerUserId, dayStart),
    db.select().from(sales).where(eq(sales.ownerUserId, ownerUserId)).orderBy(desc(sales.createdAt)).limit(5),
    db.select().from(notifications).where(and(eq(notifications.ownerUserId, ownerUserId), isNull(notifications.readAt))).orderBy(desc(notifications.createdAt)).limit(5),
  ]);
  const lowStock = allProducts.filter(product => product.stock <= product.minStock);
  return {
    metrics: {
      salesToday: todaySales.reduce((sum, sale) => sum + Number(sale.total), 0),
      ordersToday: todaySales.length,
      lowStockCount: lowStock.length,
      appointmentsToday: todayAppointments.length,
    },
    lowStock: lowStock.slice(0, 5),
    todayAppointments,
    recentSales,
    unreadNotifications,
  };
}

export async function listNotifications(ownerUserId: number) {
  const db = await requireDb();
  return db.select().from(notifications).where(eq(notifications.ownerUserId, ownerUserId)).orderBy(desc(notifications.createdAt)).limit(30);
}

export async function markNotificationRead(ownerUserId: number, id: number) {
  const db = await requireDb();
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, id), eq(notifications.ownerUserId, ownerUserId)));
}

export async function recordNotification(ownerUserId: number, input: { appointmentId?: number | null; type: "appointment_reminder" | "appointment_status" | "stock_alert"; title: string; content: string }) {
  const db = await requireDb();
  await db.insert(notifications).values({ ownerUserId, appointmentId: input.appointmentId || null, type: input.type, title: input.title, content: input.content });
}

export async function getNotificationSettings(ownerUserId: number) {
  const db = await requireDb();
  await db.insert(notificationSettings).values({ ownerUserId }).onConflictDoNothing({ target: notificationSettings.ownerUserId });
  return (await db.select().from(notificationSettings).where(eq(notificationSettings.ownerUserId, ownerUserId)).limit(1))[0]!;
}

export async function saveNotificationSettings(ownerUserId: number, input: { remindersEnabled: boolean; reminderLeadMinutes: number }) {
  const db = await requireDb();
  await getNotificationSettings(ownerUserId);
  await db.update(notificationSettings).set({ ...input, updatedAt: new Date() }).where(eq(notificationSettings.ownerUserId, ownerUserId));
  return getNotificationSettings(ownerUserId);
}

export async function saveScheduleTaskUid(ownerUserId: number, taskUid: string) {
  const db = await requireDb();
  await getNotificationSettings(ownerUserId);
  await db.update(notificationSettings).set({ scheduleCronTaskUid: taskUid, updatedAt: new Date() }).where(eq(notificationSettings.ownerUserId, ownerUserId));
}

export async function getSettingsByTaskUid(taskUid: string) {
  const db = await requireDb();
  return (await db.select().from(notificationSettings).where(eq(notificationSettings.scheduleCronTaskUid, taskUid)).limit(1))[0];
}

export async function findReminderCandidates(ownerUserId: number, leadMinutes: number, now: Date) {
  const db = await requireDb();
  const until = new Date(now.getTime() + leadMinutes * 60_000);
  return db.select({ appointment: appointments, clientName: clients.fullName, petName: pets.name })
    .from(appointments).innerJoin(clients, eq(appointments.clientId, clients.id)).innerJoin(pets, eq(appointments.petId, pets.id))
    .where(and(eq(appointments.ownerUserId, ownerUserId), gte(appointments.scheduledAt, now), lte(appointments.scheduledAt, until), isNull(appointments.reminderSentAt), inArray(appointments.status, ["scheduled", "confirmed"])))
    .orderBy(asc(appointments.scheduledAt));
}

export async function markReminderSent(ownerUserId: number, appointmentId: number, at: Date) {
  const db = await requireDb();
  await db.update(appointments).set({ reminderSentAt: at, updatedAt: new Date() }).where(and(eq(appointments.id, appointmentId), eq(appointments.ownerUserId, ownerUserId), isNull(appointments.reminderSentAt)));
}


export async function getShopOwnerUserId(userId: number) {
  const db = await getDb();
  if (!db) return userId;
  const membership = (await db.select({ ownerUserId: shopMemberships.ownerUserId })
    .from(shopMemberships)
    .where(and(eq(shopMemberships.userId, userId), eq(shopMemberships.status, "active")))
    .orderBy(asc(shopMemberships.id))
    .limit(1))[0];
  return membership?.ownerUserId ?? userId;
}

export async function hasPermission(userId: number, ownerUserId: number, permission: string) {
  if (userId === ownerUserId) return true;
  const db = await requireDb();
  const row = (await db.select({ enabled: membershipPermissions.enabled })
    .from(shopMemberships)
    .innerJoin(membershipPermissions, eq(membershipPermissions.membershipId, shopMemberships.id))
    .where(and(
      eq(shopMemberships.ownerUserId, ownerUserId),
      eq(shopMemberships.userId, userId),
      eq(shopMemberships.status, "active"),
      eq(membershipPermissions.permission, permission),
      eq(membershipPermissions.enabled, true),
    ))
    .limit(1))[0];
  return Boolean(row?.enabled);
}

export async function listShopMembers(ownerUserId: number) {
  const db = await requireDb();
  return db.select({
    membership: shopMemberships,
    user: { id: users.id, name: users.name, email: users.email, openId: users.openId },
  }).from(shopMemberships)
    .innerJoin(users, eq(users.id, shopMemberships.userId))
    .where(eq(shopMemberships.ownerUserId, ownerUserId))
    .orderBy(asc(shopMemberships.createdAt));
}

export async function listAvailableUsers(ownerUserId: number) {
  const db = await requireDb();
  const members = await db.select({ userId: shopMemberships.userId }).from(shopMemberships).where(eq(shopMemberships.ownerUserId, ownerUserId));
  const memberIds = members.map(row => row.userId);
  const rows = await db.select({ id: users.id, name: users.name, email: users.email, openId: users.openId }).from(users).orderBy(asc(users.name));
  return rows.filter(row => row.id !== ownerUserId && !memberIds.includes(row.id));
}

export async function getMemberPermissions(ownerUserId: number, membershipId: number) {
  const db = await requireDb();
  return db.select({ permission: membershipPermissions.permission, enabled: membershipPermissions.enabled })
    .from(membershipPermissions)
    .innerJoin(shopMemberships, eq(shopMemberships.id, membershipPermissions.membershipId))
    .where(and(eq(membershipPermissions.membershipId, membershipId), eq(shopMemberships.ownerUserId, ownerUserId)));
}

export async function saveShopMember(ownerUserId: number, input: {
  userId: number;
  role: "owner" | "manager" | "cashier" | "assistant" | "viewer";
  permissions: { permission: string; enabled: boolean }[];
}) {
  if (ownerUserId === input.userId) throw new TRPCError({ code: "BAD_REQUEST", message: "El propietario no necesita una membresía adicional." });
  const db = await requireDb();
  const [membership] = await db.insert(shopMemberships).values({
    ownerUserId,
    userId: input.userId,
    role: input.role,
    status: "active",
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: [shopMemberships.ownerUserId, shopMemberships.userId],
    set: { role: input.role, status: "active", updatedAt: new Date() },
  }).returning({ id: shopMemberships.id });
  if (!membership) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo guardar el miembro." });
  await db.delete(membershipPermissions).where(eq(membershipPermissions.membershipId, membership.id));
  if (input.permissions.length) {
    await db.insert(membershipPermissions).values(input.permissions.map(item => ({
      membershipId: membership.id,
      permission: item.permission,
      enabled: item.enabled,
      updatedAt: new Date(),
    })));
  }
  return membership.id;
}

export async function suspendShopMember(ownerUserId: number, membershipId: number) {
  const db = await requireDb();
  await db.update(shopMemberships).set({ status: "suspended", updatedAt: new Date() })
    .where(and(eq(shopMemberships.id, membershipId), eq(shopMemberships.ownerUserId, ownerUserId)));
}
