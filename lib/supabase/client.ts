import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey as publishableKey, supabaseUrl } from "./config";

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
