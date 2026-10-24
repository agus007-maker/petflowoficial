import { createHmac } from "node:crypto";
import type { Context } from "@netlify/functions";

declare const Netlify: { env: { get(name: string): string | undefined } };

const DEFAULT_APP_ORIGIN = "https://pettflow.netlify.app";
const GENERIC_LOGIN_ERROR = "No coincide el nombre de usuario o la contraseña.";

function getEnv(name: string): string | undefined {
  try {
    return Netlify.env.get(name) ?? process.env[name];
  } catch {
    // Lets the handler's unit tests run outside Netlify's functions runtime.
    return process.env[name];
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const configuredOrigin = (getEnv("PETFLOW_APP_ORIGIN") ?? DEFAULT_APP_ORIGIN).replace(/\/$/, "");
  return origin === configuredOrigin || /^https?:\/\/localhost(?::\d+)?$/.test(origin);
}

export async function handleAliasLogin(request: Request, context: Context): Promise<Response> {
  if (request.method !== "POST") return jsonResponse(405, { error: "Método no permitido" });
  if (!isAllowedOrigin(request.headers.get("origin"))) {
    return jsonResponse(403, { error: "Origen no permitido" });
  }

  const rawBody = await request.text();
  if (rawBody.length > 4096) return jsonResponse(413, { error: "Solicitud demasiado grande" });

  let identifier = "";
  let password = "";
  try {
    const parsed = JSON.parse(rawBody) as { identifier?: unknown; password?: unknown };
    identifier = typeof parsed.identifier === "string" ? parsed.identifier.trim().toLowerCase() : "";
    password = typeof parsed.password === "string" ? parsed.password : "";
  } catch {
    return jsonResponse(400, { error: "Solicitud inválida" });
  }

  if (
    !/^[a-z0-9][a-z0-9._-]{2,29}$/.test(identifier) ||
    password.length < 1 ||
    password.length > 1024
  ) {
    return jsonResponse(401, { error: GENERIC_LOGIN_ERROR });
  }

  const supabaseUrl = (
    getEnv("SUPABASE_URL") ??
    getEnv("NEXT_PUBLIC_SUPABASE_URL") ??
    getEnv("VITE_SUPABASE_URL") ??
    ""
  ).replace(/\/$/, "");
  const anonKey =
    getEnv("SUPABASE_ANON_KEY") ??
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
    getEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Alias login unavailable: missing server environment configuration");
    return jsonResponse(503, {
      error: "El acceso con nombre de usuario todavía no está configurado. Podés entrar con tu correo.",
    });
  }

  try {
    const clientIp = context.ip || "unknown";
    const ipBucketHash = createHmac("sha256", serviceRoleKey).update(`ip:${clientIp}`).digest("hex");
    const loginBucketHash = createHmac("sha256", serviceRoleKey).update(`login:${identifier}`).digest("hex");
    const adminHeaders = {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    };

    const rateLimit = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_petflow_alias_login_attempt`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        p_ip_bucket_hash: ipBucketHash,
        p_login_bucket_hash: loginBucketHash,
      }),
    });
    if (!rateLimit.ok) {
      console.error("Alias login rate-limit check failed with status", rateLimit.status);
      return jsonResponse(503, {
        error: "El acceso con nombre de usuario todavía no está configurado. Podés entrar con tu correo.",
      });
    }
    if (await rateLimit.json() !== true) {
      return jsonResponse(429, { error: "Hubo varios intentos. Esperá 15 minutos o ingresá con tu correo." });
    }

    const lookup = await fetch(`${supabaseUrl}/rest/v1/rpc/resolve_petflow_login_email`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ p_login_name: identifier }),
    });
    if (!lookup.ok) {
      console.error("Alias lookup failed with status", lookup.status);
      return jsonResponse(503, {
        error: "El acceso con nombre de usuario todavía no está configurado. Podés entrar con tu correo.",
      });
    }
    const email = await lookup.json() as unknown;
    if (typeof email !== "string" || !email) return jsonResponse(401, { error: GENERIC_LOGIN_ERROR });

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!authResponse.ok) return jsonResponse(401, { error: GENERIC_LOGIN_ERROR });

    const session = await authResponse.json() as {
      access_token?: unknown;
      refresh_token?: unknown;
      expires_in?: unknown;
      token_type?: unknown;
    };
    if (typeof session.access_token !== "string" || typeof session.refresh_token !== "string") {
      return jsonResponse(401, { error: GENERIC_LOGIN_ERROR });
    }

    const clearLimit = await fetch(`${supabaseUrl}/rest/v1/rpc/clear_petflow_alias_login_attempt`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        p_ip_bucket_hash: ipBucketHash,
        p_login_bucket_hash: loginBucketHash,
      }),
    });
    if (!clearLimit.ok) console.error("Alias login rate-limit reset failed with status", clearLimit.status);

    return jsonResponse(200, {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      token_type: session.token_type,
    });
  } catch (error) {
    console.error("Alias login request failed", error instanceof Error ? error.name : "unknown");
    return jsonResponse(503, { error: "No pudimos completar el acceso. Probá de nuevo o ingresá con tu correo." });
  }
}

export default async (request: Request, context: Context): Promise<Response> =>
  handleAliasLogin(request, context);
