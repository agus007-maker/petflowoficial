import { afterEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@netlify/functions";
import { handleAliasLogin } from "../netlify/functions/alias-login.mts";

const appOrigin = "https://pettflow.netlify.app";
const contextFor = (ip: string) => ({ ip }) as Context;
const makeRequest = (body: unknown, origin = appOrigin) => new Request(
  `${appOrigin}/.netlify/functions/alias-login`,
  {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  },
);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Netlify alias login", () => {
  it("rejects foreign origins before making any upstream request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await handleAliasLogin(
      makeRequest({ identifier: "petflow", password: "not-a-real-password" }, "https://malicious.example"),
      contextFor("203.0.113.8"),
    );
    expect(result.status).toBe(403);
    expect(result.headers.get("access-control-allow-origin")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the same credential error for an unknown name without exposing email addresses", async () => {
    vi.stubEnv("SUPABASE_URL", "https://petflow-test.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "public-test-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-only-test-key");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/consume_petflow_alias_login_attempt")) {
        return new Response("true", { status: 200 });
      }
      if (url.endsWith("/resolve_petflow_login_email")) {
        return new Response("null", { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await handleAliasLogin(
      makeRequest({ identifier: "petflow", password: "not-a-real-password" }),
      contextFor("203.0.113.8"),
    );
    const body = await result.text();
    expect(result.status).toBe(401);
    expect(body).toContain("No coincide el nombre de usuario o la contraseña");
    expect(body).not.toContain("@");
  });

  it("returns only auth session tokens after a successful alias login", async () => {
    vi.stubEnv("SUPABASE_URL", "https://petflow-test.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "public-test-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-only-test-key");
    const internalEmail = "private.person@example.com";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/consume_petflow_alias_login_attempt")) {
        return new Response("true", { status: 200 });
      }
      if (url.endsWith("/resolve_petflow_login_email")) {
        return new Response(JSON.stringify(internalEmail), { status: 200 });
      }
      if (url.endsWith("/auth/v1/token?grant_type=password")) {
        return new Response(JSON.stringify({
          access_token: "access-test-token",
          refresh_token: "refresh-test-token",
          expires_in: 3600,
          token_type: "bearer",
          user: { email: internalEmail },
        }), { status: 200 });
      }
      if (url.endsWith("/clear_petflow_alias_login_attempt")) {
        return new Response("null", { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await handleAliasLogin(
      makeRequest({ identifier: "Patitas.Martinez", password: "correct-test-password" }),
      contextFor("203.0.113.9"),
    );
    const body = await result.text();

    expect(result.status).toBe(200);
    expect(body).toContain("access-test-token");
    expect(body).toContain("refresh-test-token");
    expect(body).not.toContain(internalEmail);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("fails closed when the server-only key is not configured", async () => {
    vi.stubEnv("SUPABASE_URL", "https://petflow-test.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "public-test-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await handleAliasLogin(
      makeRequest({ identifier: "petflow", password: "not-a-real-password" }),
      contextFor("203.0.113.10"),
    );
    expect(result.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
