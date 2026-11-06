import { createHmac } from "node:crypto";
import type { Express, Request, Response } from "express";

const DEFAULT_URL = "https://msrcjsrfwkolxlngvdvn.supabase.co";
const DEFAULT_PUBLIC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zcmNqc3Jmd2tvbHhsbmd2ZHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTgxMDcsImV4cCI6MjEwMjYzNDEwN30.CMW05AluLSKHg3h1HwfxCrvtAc7l-ETgDFNwwkN6hyM";
const genericError = "No coincide el nombre de usuario o la contraseña.";

function config() {
  return {
    url: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? DEFAULT_URL).replace(/\/$/, ""),
    publicKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? DEFAULT_PUBLIC_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

function json(response: Response, status: number, body: unknown) {
  return response.status(status).set("cache-control", "no-store").json(body);
}

function validUsername(value: unknown) {
  return typeof value === "string" && /^[a-z0-9][a-z0-9._-]{2,29}$/.test(value.trim().toLowerCase());
}

export async function credentialsSignIn(request: Request, response: Response) {
  const identifier = typeof request.body?.identifier === "string" ? request.body.identifier.trim().toLowerCase() : "";
  const password = typeof request.body?.password === "string" ? request.body.password : "";
  if (!validUsername(identifier) || password.length < 1 || password.length > 1024) return json(response, 401, { error: genericError });
  const { url, publicKey, serviceKey } = config();
  if (!serviceKey) return json(response, 503, { error: "El acceso con usuario todavía no está configurado. Podés entrar con tu correo." });
  const adminHeaders = { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json" };
  const hash = (value: string) => createHmac("sha256", serviceKey).update(value).digest("hex");
  const ipBucketHash = hash(`ip:${request.ip || request.socket.remoteAddress || "unknown"}`);
  const loginBucketHash = hash(`login:${identifier}`);
  try {
    const rateLimit = await fetch(`${url}/rest/v1/rpc/consume_petflow_alias_login_attempt`, { method: "POST", headers: adminHeaders, body: JSON.stringify({ p_ip_bucket_hash: ipBucketHash, p_login_bucket_hash: loginBucketHash }), signal: AbortSignal.timeout(10_000) });
    if (!rateLimit.ok) return json(response, 503, { error: "El acceso con usuario todavía no está configurado. Podés entrar con tu correo." });
    if ((await rateLimit.json()) !== true) return json(response, 429, { error: "Hubo varios intentos. Esperá 15 minutos o ingresá con tu correo." });

    const lookup = await fetch(`${url}/rest/v1/rpc/resolve_petflow_login_email`, { method: "POST", headers: adminHeaders, body: JSON.stringify({ p_login_name: identifier }), signal: AbortSignal.timeout(10_000) });
    if (!lookup.ok) return json(response, 503, { error: "El acceso con usuario todavía no está configurado. Podés entrar con tu correo." });
    const email = await lookup.json();
    if (typeof email !== "string" || !email) return json(response, 401, { error: genericError });

    const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: publicKey, "content-type": "application/json" }, body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(10_000) });
    if (!authResponse.ok) return json(response, 401, { error: genericError });
    const session = await authResponse.json() as { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown; token_type?: unknown };
    if (typeof session.access_token !== "string" || typeof session.refresh_token !== "string") return json(response, 401, { error: genericError });
    await fetch(`${url}/rest/v1/rpc/clear_petflow_alias_login_attempt`, { method: "POST", headers: adminHeaders, body: JSON.stringify({ p_ip_bucket_hash: ipBucketHash, p_login_bucket_hash: loginBucketHash }), signal: AbortSignal.timeout(10_000) }).catch(() => undefined);
    return json(response, 200, session);
  } catch (error) {
    console.error("Credential login failed", error instanceof Error ? error.name : "unknown");
    return json(response, 503, { error: "No pudimos completar el acceso. Probá de nuevo o ingresá con tu correo." });
  }
}

export function registerCredentialRoutes(app: Express) {
  app.post("/api/auth/credentials/sign-in", credentialsSignIn);
  app.post("/.netlify/functions/alias-login", credentialsSignIn);
}
