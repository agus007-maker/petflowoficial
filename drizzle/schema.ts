import {
  boolean,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core identity table managed by the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const products = mysqlTable(
  "products",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerUserId: int("ownerUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    sku: varchar("sku", { length: 80 }),
    category: varchar("category", { length: 48 }).notNull(),
    stock: int("stock").notNull().default(0),
    minStock: int("minStock").notNull().default(3),
    costPrice: decimal("costPrice", { precision: 12, scale: 2 }).notNull().default("0"),
    salePrice: decimal("salePrice", { precision: 12, scale: 2 }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("products_owner_idx").on(table.ownerUserId), index("products_owner_category_idx").on(table.ownerUserId, table.category)]
);

export const clients = mysqlTable(
  "clients",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerUserId: int("ownerUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    fullName: varchar("fullName", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 48 }),
    email: varchar("email", { length: 320 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("clients_owner_idx").on(table.ownerUserId), index("clients_owner_name_idx").on(table.ownerUserId, table.fullName)]
);

export const pets = mysqlTable(
  "pets",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerUserId: int("ownerUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    clientId: int("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    species: varchar("species", { length: 40 }).notNull(),
    breed: varchar("breed", { length: 100 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("pets_owner_idx").on(table.ownerUserId), index("pets_client_idx").on(table.clientId)]
);

export const sales = mysqlTable(
  "sales",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerUserId: int("ownerUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    clientId: int("clientId").references(() => clients.id, { onDelete: "set null" }),
    paymentMethod: mysqlEnum("paymentMethod", ["cash", "card", "transfer", "other"]).notNull(),
    total: decimal("total", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("sales_owner_created_idx").on(table.ownerUserId, table.createdAt), index("sales_client_idx").on(table.clientId)]
);

export const saleItems = mysqlTable(
  "saleItems",
  {
    id: int("id").autoincrement().primaryKey(),
    saleId: int("saleId").notNull().references(() => sales.id, { onDelete: "cascade" }),
    productId: int("productId").references(() => products.id, { onDelete: "set null" }),
    productName: varchar("productName", { length: 160 }).notNull(),
    unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
    quantity: int("quantity").notNull(),
    lineTotal: decimal("lineTotal", { precision: 12, scale: 2 }).notNull(),
  },
  table => [index("sale_items_sale_idx").on(table.saleId)]
);

export const appointmentStatusValues = ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"] as const;

export const appointments = mysqlTable(
  "appointments",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerUserId: int("ownerUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    clientId: int("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
    petId: int("petId").notNull().references(() => pets.id, { onDelete: "cascade" }),
    service: varchar("service", { length: 100 }).notNull(),
    scheduledAt: timestamp("scheduledAt").notNull(),
    durationMinutes: int("durationMinutes").notNull().default(60),
    status: mysqlEnum("status", appointmentStatusValues).notNull().default("scheduled"),
    notes: text("notes"),
    reminderSentAt: timestamp("reminderSentAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("appointments_owner_date_idx").on(table.ownerUserId, table.scheduledAt), index("appointments_reminder_idx").on(table.ownerUserId, table.reminderSentAt)]
);

export const notificationSettings = mysqlTable(
  "notificationSettings",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerUserId: int("ownerUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    remindersEnabled: boolean("remindersEnabled").notNull().default(true),
    reminderLeadMinutes: int("reminderLeadMinutes").notNull().default(60),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("notification_settings_owner_unique").on(table.ownerUserId), index("notification_settings_task_idx").on(table.scheduleCronTaskUid)]
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerUserId: int("ownerUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    appointmentId: int("appointmentId").references(() => appointments.id, { onDelete: "set null" }),
    type: mysqlEnum("type", ["appointment_reminder", "appointment_status", "stock_alert"]).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    content: text("content").notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("notifications_owner_created_idx").on(table.ownerUserId, table.createdAt)]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
