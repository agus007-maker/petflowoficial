import { createHmac } from "node:crypto";

type HandlerEvent = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body: string | null;
  isBase64Encoded?: boolean;
};

type HandlerResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

const DEFAULT_APP_ORIGIN = "https://pettflow.netlify.app";
const GENERIC_LOGIN_ERROR = "No coincide el nombre de usuario o la contraseña.";

function response(statusCode: number, body: unknown, origin?: string): HandlerResponse {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(origin ? {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        vary: "Origin",
      } : {}),
    },
    body: JSON.stringify(body),
  };
}

function allowedOrigin(origin: string | undefined): string | undefined {
  if (!origin) return undefined;
  const configuredOrigin = (process.env.PETFLOW_APP_ORIGIN ?? DEFAULT_APP_ORIGIN).replace(/\/$/, "");
  if (origin === configuredOrigin || /^https?:\/\/localhost(?::\d+)?$/.test(origin)) return origin;
  return undefined;
}

export const handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  const originHeader = event.headers.origin ?? event.headers.Origin;
  const corsOrigin = allowedOrigin(originHeader);
  if (event.httpMethod === "OPTIONS") {
    return corsOrigin ? { ...response(204, null, corsOrigin), body: "" } : response(403, { error: "Origen no permitido" });
  }
  if (event.httpMethod !== "POST") return response(405, { error: "Método no permitido" }, corsOrigin);
  if (!corsOrigin) return response(403, { error: "Origen no permitido" });

  const rawBody = event.body ?? "";
  if (rawBody.length > 4096) return response(413, { error: "Solicitud demasiado grande" }, corsOrigin);

  let identifier = "";
  let password = "";
  try {
    const parsed = JSON.parse(event.isBase64Encoded ? Buffer.from(rawBody, "base64").toString("utf8") : rawBody) as {
      identifier?: unknown;
      password?: unknown;
    };
    identifier = typeof parsed.identifier === "string" ? parsed.identifier.trim().toLowerCase() : "";
    password = typeof parsed.password === "string" ? parsed.password : "";
  } catch {
    return response(400, { error: "Solicitud inválida" }, corsOrigin);
  }

  if (
    !/^[a-z0-9][a-z0-9._-]{2,29}$/.test(identifier) ||
    password.length < 1 ||
    password.length > 1024
  ) {
    return response(401, { error: GENERIC_LOGIN_ERROR }, corsOrigin);
  }

  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Alias login unavailable: missing server environment configuration");
    return response(503, { error: "El acceso con nombre de usuario todavía no está configurado. Podés entrar con tu correo." }, corsOrigin);
  }

  try {
    const clientIp = (
      event.headers["x-nf-client-connection-ip"] ??
      event.headers["x-forwarded-for"] ??
      "unknown"
    ).split(",")[0]?.trim() || "unknown";
    const ipBucketHash = createHmac("sha256", serviceRoleKey).update(`ip:${clientIp}`).digest("hex");
    const loginBucketHash = createHmac("sha256", serviceRoleKey).update(`login:${identifier}`).digest("hex");
    const rateLimit = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_petflow_alias_login_attempt`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_ip_bucket_hash: ipBucketHash,
        p_login_bucket_hash: loginBucketHash,
      }),
    });
    if (!rateLimit.ok) {
      console.error("Alias login rate-limit check failed with status", rateLimit.status);
      return response(503, { error: "El acceso con nombre de usuario todavía no está configurado. Podés entrar con tu correo." }, corsOrigin);
    }
    if (await rateLimit.json() !== true) {
      return response(429, { error: "Hubo varios intentos. Esperá 15 minutos o ingresá con tu correo." }, corsOrigin);
    }

    const lookup = await fetch(`${supabaseUrl}/rest/v1/rpc/resolve_petflow_login_email`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ p_login_name: identifier }),
    });
    if (!lookup.ok) {
      console.error("Alias lookup failed with status", lookup.status);
      return response(503, { error: "El acceso con nombre de usuario todavía no está configurado. Podés entrar con tu correo." }, corsOrigin);
    }
    const email = await lookup.json() as unknown;
    if (typeof email !== "string" || !email) {
      return response(401, { error: GENERIC_LOGIN_ERROR }, corsOrigin);
    }

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!authResponse.ok) return response(401, { error: GENERIC_LOGIN_ERROR }, corsOrigin);

    const session = await authResponse.json() as {
      access_token?: unknown;
      refresh_token?: unknown;
      expires_in?: unknown;
      token_type?: unknown;
    };
    if (typeof session.access_token !== "string" || typeof session.refresh_token !== "string") {
      return response(401, { error: GENERIC_LOGIN_ERROR }, corsOrigin);
    }

    const clearLimit = await fetch(`${supabaseUrl}/rest/v1/rpc/clear_petflow_alias_login_attempt`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_ip_bucket_hash: ipBucketHash,
        p_login_bucket_hash: loginBucketHash,
      }),
    });
    if (!clearLimit.ok) console.error("Alias login rate-limit reset failed with status", clearLimit.status);

    return response(200, {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      token_type: session.token_type,
    }, corsOrigin);
  } catch (error) {
    console.error("Alias login request failed", error instanceof Error ? error.name : "unknown");
    return response(503, { error: "No pudimos completar el acceso. Probá de nuevo o ingresá con tu correo." }, corsOrigin);
  }
};
