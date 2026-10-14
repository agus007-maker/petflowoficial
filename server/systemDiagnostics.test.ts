import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runSystemDiagnostics } from "./scheduled/systemDiagnostics";

describe("diagnóstico programado de PetFlow", () => {
  it("confirma runtime, entrypoint y Supabase sin modificar datos", async () => {
    const publicDir = await mkdtemp(path.join(os.tmpdir(), "petflow-diagnostics-"));
    await writeFile(path.join(publicDir, "index.html"), "<!doctype html>");
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("ok", { status: 200 })
    );

    const result = await runSystemDiagnostics({
      publicDir,
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "public-key",
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    expect(result.checks.map((check) => check.name)).toEqual([
      "runtime",
      "static-entrypoint",
      "supabase-auth",
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/health",
      expect.objectContaining({ method: "GET", headers: { apikey: "public-key" } })
    );
  });

  it("informa una falla de entrypoint sin lanzar ni escribir datos", async () => {
    const publicDir = await mkdtemp(path.join(os.tmpdir(), "petflow-diagnostics-missing-"));
    await mkdir(path.join(publicDir, "empty"));
    const result = await runSystemDiagnostics({
      publicDir,
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "public-key",
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(new Response("ok", { status: 200 })),
    });

    expect(result.ok).toBe(false);
    expect(result.checks.find((check) => check.name === "static-entrypoint")).toMatchObject({
      status: "failed",
    });
  });
});
