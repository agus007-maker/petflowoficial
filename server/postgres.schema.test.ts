import { describe, expect, it } from "vitest";
import { getTableName } from "drizzle-orm";
import { appointments, clients, notificationSettings, notifications, pets, products, saleItems, sales, users } from "../drizzle/schema";

describe("PetFlow PostgreSQL schema", () => {
  it("keeps every business table namespaced for Supabase", () => {
    expect([
      users,
      products,
      clients,
      pets,
      sales,
      saleItems,
      appointments,
      notificationSettings,
      notifications,
    ].map(getTableName)).toEqual([
      "petflow_users",
      "petflow_products",
      "petflow_clients",
      "petflow_pets",
      "petflow_sales",
      "petflow_sale_items",
      "petflow_appointments",
      "petflow_notification_settings",
      "petflow_notifications",
    ]);
  });

  it("does not reuse the pre-existing products table", () => {
    expect(getTableName(products)).not.toBe("products");
  });
});
