export const DEFAULT_SUPABASE_URL = "https://msrcjsrfwkolxlngvdvn.supabase.co";
export const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zcmNqc3Jmd2tvbHhsbmd2ZHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTgxMDcsImV4cCI6MjEwMjYzNDEwN30.CMW05AluLSKHg3h1HwfxCrvtAc7l-ETgDFNwwkN6hyM";

type SupabaseEnvironment = Record<string, string | undefined>;

export function resolveSupabaseConfig(environment: SupabaseEnvironment) {
  const configuredUrl =
    environment.SUPABASE_URL ||
    environment.VITE_SUPABASE_URL ||
    environment.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseUrl = (configuredUrl || DEFAULT_SUPABASE_URL).replace(
    /\/$/,
    ""
  );

  const configuredPublicKey =
    environment.SUPABASE_ANON_KEY ||
    environment.VITE_SUPABASE_PUBLISHABLE_KEY ||
    environment.VITE_SUPABASE_ANON_KEY ||
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Never pair the default public key with a different Supabase project.
  const defaultKeyMatchesProject = supabaseUrl === DEFAULT_SUPABASE_URL;
  const supabasePublicKey =
    configuredPublicKey ||
    (defaultKeyMatchesProject ? DEFAULT_SUPABASE_PUBLISHABLE_KEY : "");

  return { supabaseUrl, supabasePublicKey };
}
