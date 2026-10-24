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
