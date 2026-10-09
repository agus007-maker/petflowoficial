import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const PUBLIC_SUPABASE_URL = "https://msrcjsrfwkolxlngvdvn.supabase.co";
const PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zcmNqc3Jmd2tvbHhsbmd2ZHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTgxMDcsImV4cCI6MjEwMjYzNDEwN30.CMW05AluLSKHg3h1HwfxCrvtAc7l-ETgDFNwwkN6hyM";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? PUBLIC_SUPABASE_ANON_KEY;

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Falta ${name} en el entorno de ejecución.`,
    );
  }
  return value;
}

export function createClient(): SupabaseClient {
  return createBrowserClient(
    required(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"),
    required(publishableKey, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  );
}

/**
 * URL pública usada en enlaces enviados por correo.
 * Debe configurarse en producción; sólo se usa origin como fallback local.
 */
export function getPublicAppUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}
