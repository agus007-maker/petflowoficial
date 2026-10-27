export type PasswordLinkFlow = "setup" | "recovery" | null;

function readParams(value: string): URLSearchParams {
  return new URLSearchParams(value.startsWith("#") ? value.slice(1) : value);
}

/** Recognize Supabase auth callbacks even when redirect query parameters are absent. */
export function detectPasswordLinkFlow(search: string, hash: string): PasswordLinkFlow {
  const query = readParams(search);
  const fragment = readParams(hash);
  const flow = query.get("flow") ?? fragment.get("flow");
  const type = query.get("type") ?? fragment.get("type");
  const errorCode = query.get("error_code") ?? fragment.get("error_code");

  if (flow === "password-recovery" || type === "recovery" || errorCode === "otp_expired") {
    return "recovery";
  }
  if (
    flow === "create-password" ||
    query.has("code") ||
    type === "signup" ||
    type === "magiclink" ||
    type === "email"
  ) {
    return "setup";
  }
  return null;
}

export type TokenHashLink = { tokenHash: string; type: "recovery" | "email" };

/**
 * Enlace "directo" de la plantilla de correo (…/?token_hash=XXXX&type=recovery).
 * A diferencia del enlace PKCE (?code=…), no depende del navegador/dispositivo donde se
 * pidió el correo, así que funciona aunque se abra desde el celular o desde otro navegador.
 */
export function readTokenHashLink(search: string, hash: string): TokenHashLink | null {
  const query = readParams(search);
  const fragment = readParams(hash);
  const tokenHash = query.get("token_hash") ?? fragment.get("token_hash");
  if (!tokenHash) return null;
  const type = query.get("type") ?? fragment.get("type");
  const flow = query.get("flow") ?? fragment.get("flow");
  return { tokenHash, type: type === "recovery" || flow === "password-recovery" ? "recovery" : "email" };
}
