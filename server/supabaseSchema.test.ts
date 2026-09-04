import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0001_petflow_schema.sql"),
  "utf8",
);

describe("esquema operativo de PetFlow en Supabase", () => {
  it("usa una función transaccional y privilegiada para ventas, sin exponer inserciones directas", () => {
    const saleFunction = schema.match(/create or replace function public\.create_sale\([\s\S]*?\n\$\$;/)?.[0] ?? "";

    expect(saleFunction).toContain("security definer set search_path = ''");
    expect(saleFunction).toContain("for update");
    expect(saleFunction).toContain("insert into public.sales");
    expect(saleFunction).toContain("insert into public.sale_items");
    expect(saleFunction).toContain("update public.products set stock = stock - v_line.quantity");
    expect(schema).toContain("grant select on public.sales, public.sale_items to authenticated;");
    expect(schema).toContain("grant execute on function public.create_sale(uuid, uuid, public.payment_method, jsonb) to authenticated;");
  });

  it("incluye el alta atómica de cliente, mascota y turno", () => {
    const appointmentFunction = schema.match(/create or replace function public\.create_appointment_with_new_client\([\s\S]*?\n\$\$;/)?.[0] ?? "";

    expect(appointmentFunction).toContain("insert into public.clients");
    expect(appointmentFunction).toContain("insert into public.pets");
    expect(appointmentFunction).toContain("insert into public.appointments");
  });

  it("habilita RLS e índices de aislamiento en los registros operativos", () => {
    ["products", "clients", "pets", "sales", "sale_items", "appointments", "notifications"].forEach(table => {
      expect(schema).toContain(`alter table public.${table} enable row level security;`);
    });
    expect(schema).toContain("create index products_shop_name_idx on public.products(pet_shop_id, name);");
    expect(schema).toContain("create index appointments_shop_scheduled_idx on public.appointments(pet_shop_id, scheduled_at);");
  });
});
