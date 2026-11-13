import { describe, expect, it } from "vitest";

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://msrcjsrfwkolxlngvdvn.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

describe("secreto server-side de Supabase", () => {
  it("acepta la clave privada en un endpoint liviano de Auth", async () => {
    expect(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY no está configurada").toBeTruthy();
    const response = await fetch(new URL("/auth/v1/settings", projectUrl), {
      headers: { apikey: serviceRoleKey!, authorization: `Bearer ${serviceRoleKey!}` },
    });
    expect(response.ok, `Supabase respondió HTTP ${response.status}`).toBe(true);
  }, 15_000);
});
