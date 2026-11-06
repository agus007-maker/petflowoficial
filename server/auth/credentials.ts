import type { Express } from "express";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://msrcjsrfwkolxlngvdvn.supabase.co";
const DEFAULT_PUBLIC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zcmNqc3Jmd2tvbHhsbmd2ZHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTgxMDcsImV4cCI6MjEwMjYzNDEwN30.CMW05AluLSKHg3h1HwfxCrvtAc7l-ETgDFNwwkN6hyM";
const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,31}$/;

type CredentialBody = { username?: unknown; password?: unknown; passwordConfirmation?: unknown };

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? DEFAULT_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? DEFAULT_PUBLIC_KEY;
  return { url, serviceKey, publicKey };
}

function adminClient() {
  const { url, serviceKey } = config();
  if (!serviceKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY para gestionar credenciales de acceso.");
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

function normalizeUsername(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function bearer(request: { headers: { authorization?: string } }) {
  const value = request.headers.authorization ?? "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

export function registerCredentialRoutes(app: Express) {
  app.post("/api/auth/credentials/setup", async (request, response) => {
    try {
      const { username, password, passwordConfirmation } = request.body as CredentialBody;
      const normalized = normalizeUsername(username);
      if (!usernamePattern.test(normalized)) return response.status(400).json({ message: "El usuario debe tener 3 a 32 caracteres: letras minúsculas, números, punto, guion o guion bajo." });
      if (typeof password !== "string" || password.length < 8) return response.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres." });
      if (password !== passwordConfirmation) return response.status(400).json({ message: "Las contraseñas no coinciden." });
      const token = bearer(request);
      if (!token) return response.status(401).json({ message: "Sesión inicial requerida." });
      const admin = adminClient();
      const { data: current, error: currentError } = await admin.auth.getUser(token);
      if (currentError || !current.user) return response.status(401).json({ message: "La sesión inicial expiró. Solicitá un nuevo enlace." });
      const { data: existing } = await admin.from("user_login_profiles").select("user_id").eq("username", normalized).maybeSingle();
      if (existing) return response.status(409).json({ message: "Ese nombre de usuario ya está ocupado." });
      const { error: profileError } = await admin.from("user_login_profiles").insert({ user_id: current.user.id, username: normalized });
      if (profileError) {
        if (profileError.code === "23505") return response.status(409).json({ message: "Ese nombre de usuario ya está ocupado." });
        return response.status(400).json({ message: profileError.message });
      }
      const { error: updateError } = await admin.auth.admin.updateUserById(current.user.id, { password });
      if (updateError) {
        await admin.from("user_login_profiles").delete().eq("user_id", current.user.id);
        return response.status(400).json({ message: updateError.message });
      }
      return response.json({ ok: true, username: normalized });
    } catch (error) {
      return response.status(503).json({ message: error instanceof Error ? error.message : "La configuración de acceso no está disponible." });
    }
  });

  app.post("/api/auth/credentials/sign-in", async (request, response) => {
    try {
      const username = normalizeUsername((request.body as CredentialBody).username);
      const password = (request.body as CredentialBody).password;
      if (!usernamePattern.test(username) || typeof password !== "string" || !password) return response.status(401).json({ message: "Usuario o contraseña incorrectos." });
      const admin = adminClient();
      const { data: profile } = await admin.from("user_login_profiles").select("user_id").eq("username", username).maybeSingle();
      if (!profile) return response.status(401).json({ message: "Usuario o contraseña incorrectos." });
      const { data: account, error: accountError } = await admin.auth.admin.getUserById(profile.user_id);
      if (accountError || !account.user?.email) return response.status(401).json({ message: "Usuario o contraseña incorrectos." });
      const { url, publicKey } = config();
      const publicClient = createClient(url, publicKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const { data: session, error } = await publicClient.auth.signInWithPassword({ email: account.user.email, password });
      if (error || !session.session) return response.status(401).json({ message: "Usuario o contraseña incorrectos." });
      return response.json({ access_token: session.session.access_token, refresh_token: session.session.refresh_token });
    } catch (error) {
      return response.status(503).json({ message: error instanceof Error ? error.message : "El acceso por usuario no está disponible." });
    }
  });
}
