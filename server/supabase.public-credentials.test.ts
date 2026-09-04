import { describe, expect, it } from "vitest";

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

describe("credenciales públicas de Supabase", () => {
  it("aceptan una consulta liviana al endpoint de configuración de Auth", async () => {
    expect(projectUrl).toMatch(/^https:\/\/.+/);
    expect(publishableKey).toBeTruthy();

    const response = await fetch(new URL("/auth/v1/settings", projectUrl).toString(), {
      headers: {
        apikey: publishableKey!,
        authorization: `Bearer ${publishableKey}`,
      },
    });

    expect(response.ok, `${response.status}: ${await response.text()}`).toBe(true);
  }, 15_000);
});
