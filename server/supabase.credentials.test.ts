import { describe, expect, it } from "vitest";

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function settingsEndpoint(url: string) {
  return new URL("/auth/v1/settings", url).toString();
}

async function assertSupabaseCredential(key: string, label: string) {
  const response = await fetch(settingsEndpoint(projectUrl!), {
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
    },
  });

  expect(response.ok, `${label}: ${response.status} ${await response.text()}`).toBe(true);
}

describe("credenciales de Supabase", () => {
  it("tiene la configuración requerida", () => {
    expect(projectUrl).toMatch(/^https:\/\/.+/);
    expect(publishableKey).toBeTruthy();
    expect(serviceRoleKey).toBeTruthy();
  });

  it("acepta la clave publicable", async () => {
    await assertSupabaseCredential(publishableKey!, "Clave publicable");
  }, 15_000);

  it("acepta la clave de servicio del servidor", async () => {
    await assertSupabaseCredential(serviceRoleKey!, "Clave de servicio");
  }, 15_000);
});
