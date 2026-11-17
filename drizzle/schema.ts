import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  index,
} from "drizzle-orm/pg-core";

/** Core identity table managed by the Manus OAuth flow. */
export const userRole = pgEnum("petflow_user_role", ["user", "admin"]);
export const membershipRole = pgEnum("petflow_membership_role", ["owner", "manager", "cashier", "assistant", "viewer"]);
export const membershipStatus = pgEnum("petflow_membership_status", ["active", "invited", "suspended"]);
export const paymentMethod = pgEnum("petflow_payment_method", ["cash", "card", "transfer", "other"]);
export const appointmentStatus = pgEnum("petflow_appointment_status", [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);
export const notificationType = pgEnum("petflow_notification_type", [
  "appointment_reminder",
  "appointment_status",
  "stock_alert",
]);

export const users = pgTable(
  "petflow_users",
  {
    id: serial("id").primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: userRole("role").default("user").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [index("petflow_users_open_id_idx").on(table.openId)],
);

export const shopMemberships = pgTable(
  "petflow_shop_memberships",
  {
    id: serial("id").primaryKey(),
    ownerUserId: integer("ownerUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: membershipRole("role").default("assistant").notNull(),
    status: membershipStatus("status").default("active").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [
    uniqueIndex("petflow_shop_memberships_owner_user_unique").on(table.ownerUserId, table.userId),
    index("petflow_shop_memberships_user_idx").on(table.userId),
  ],
);

export const membershipPermissions = pgTable(
  "petflow_membership_permissions",
  {
    id: serial("id").primaryKey(),
    membershipId: integer("membershipId").notNull().references(() => shopMemberships.id, { onDelete: "cascade" }),
    permission: varchar("permission", { length: 80 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [
    uniqueIndex("petflow_membership_permissions_unique").on(table.membershipId, table.permission),
    index("petflow_membership_permissions_membership_idx").on(table.membershipId),
  ],
);

export const products = pgTable(
  "petflow_products",
  {
    id: serial("id").primaryKey(),
    ownerUserId: integer("ownerUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    sku: varchar("sku", { length: 80 }),
    category: varchar("category", { length: 48 }).notNull(),
    stock: integer("stock").notNull().default(0),
    minStock: integer("minStock").notNull().default(3),
    costPrice: numeric("costPrice", { precision: 12, scale: 2 }).notNull().default("0"),
    salePrice: numeric("salePrice", { precision: 12, scale: 2 }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [index("petflow_products_owner_idx").on(table.ownerUserId), index("petflow_products_owner_category_idx").on(table.ownerUserId, table.category)],
);

export const clients = pgTable(
  "petflow_clients",
  {
    id: serial("id").primaryKey(),
    ownerUserId: integer("ownerUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    fullName: varchar("fullName", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 48 }),
    email: varchar("email", { length: 320 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [index("petflow_clients_owner_idx").on(table.ownerUserId), index("petflow_clients_owner_name_idx").on(table.ownerUserId, table.fullName)],
);

export const pets = pgTable(
  "petflow_pets",
  {
    id: serial("id").primaryKey(),
    ownerUserId: integer("ownerUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    species: varchar("species", { length: 40 }).notNull(),
    breed: varchar("breed", { length: 100 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [index("petflow_pets_owner_idx").on(table.ownerUserId), index("petflow_pets_client_idx").on(table.clientId)],
);

export const sales = pgTable(
  "petflow_sales",
  {
    id: serial("id").primaryKey(),
    ownerUserId: integer("ownerUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    clientId: integer("clientId").references(() => clients.id, { onDelete: "set null" }),
    paymentMethod: paymentMethod("paymentMethod").notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [index("petflow_sales_owner_created_idx").on(table.ownerUserId, table.createdAt), index("petflow_sales_client_idx").on(table.clientId)],
);

export const saleItems = pgTable(
  "petflow_sale_items",
  {
    id: serial("id").primaryKey(),
    saleId: integer("saleId").notNull().references(() => sales.id, { onDelete: "cascade" }),
    productId: integer("productId").references(() => products.id, { onDelete: "set null" }),
    productName: varchar("productName", { length: 160 }).notNull(),
    unitPrice: numeric("unitPrice", { precision: 12, scale: 2 }).notNull(),
    quantity: integer("quantity").notNull(),
    lineTotal: numeric("lineTotal", { precision: 12, scale: 2 }).notNull(),
  },
  table => [index("petflow_sale_items_sale_idx").on(table.saleId)],
);

export const appointments = pgTable(
  "petflow_appointments",
  {
    id: serial("id").primaryKey(),
    ownerUserId: integer("ownerUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
    petId: integer("petId").notNull().references(() => pets.id, { onDelete: "cascade" }),
    service: varchar("service", { length: 100 }).notNull(),
    scheduledAt: timestamp("scheduledAt", { withTimezone: true }).notNull(),
    durationMinutes: integer("durationMinutes").notNull().default(60),
    status: appointmentStatus("status").notNull().default("scheduled"),
    notes: text("notes"),
    reminderSentAt: timestamp("reminderSentAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [index("petflow_appointments_owner_date_idx").on(table.ownerUserId, table.scheduledAt), index("petflow_appointments_reminder_idx").on(table.ownerUserId, table.reminderSentAt)],
);

export const notificationSettings = pgTable(
  "petflow_notification_settings",
  {
    id: serial("id").primaryKey(),
    ownerUserId: integer("ownerUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    remindersEnabled: boolean("remindersEnabled").notNull().default(true),
    reminderLeadMinutes: integer("reminderLeadMinutes").notNull().default(60),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [uniqueIndex("petflow_notification_settings_owner_unique").on(table.ownerUserId), index("petflow_notification_settings_task_idx").on(table.scheduleCronTaskUid)],
);

export const notifications = pgTable(
  "petflow_notifications",
  {
    id: serial("id").primaryKey(),
    ownerUserId: integer("ownerUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    appointmentId: integer("appointmentId").references(() => appointments.id, { onDelete: "set null" }),
    type: notificationType("type").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    content: text("content").notNull(),
    readAt: timestamp("readAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [index("petflow_notifications_owner_created_idx").on(table.ownerUserId, table.createdAt)],
);

export const appointmentStatusValues = ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"] as const;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
