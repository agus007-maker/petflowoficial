import fs from "node:fs/promises";
import path from "node:path";
import type { Request, RequestHandler, Response } from "express";
import { TRPCError } from "@trpc/server";
import { sdk } from "../_core/sdk";
import { notifyOwner } from "../_core/notification";

export const SYSTEM_DIAGNOSTICS_PATH = "/api/scheduled/system-diagnostics";

const DEFAULT_SUPABASE_URL = "https://msrcjsrfwkolxlngvdvn.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zcmNqc3Jmd2tvbHhsbmd2ZHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTgxMDcsImV4cCI6MjEwMjYzNDEwN30.CMW05AluLSKHg3h1HwfxCrvtAc7l-ETgDFNwwkN6hyM";

type DiagnosticStatus = "ok" | "failed";

export type DiagnosticCheck = {
  name: string;
  status: DiagnosticStatus;
  detail: string;
  durationMs: number;
};

export type DiagnosticsResult = {
  checkedAt: string;
  ok: boolean;
  checks: DiagnosticCheck[];
};

type DiagnosticsOptions = {
  publicDir: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  fetchImpl?: typeof fetch;
};

const elapsed = (start: number): number => Math.round(performance.now() - start);

async function runCheck(
  name: string,
  callback: () => Promise<string>
): Promise<DiagnosticCheck> {
  const start = performance.now();
  try {
    return {
      name,
      status: "ok",
      detail: await callback(),
      durationMs: elapsed(start),
    };
  } catch (error) {
    return {
      name,
      status: "failed",
      detail: error instanceof Error ? error.message : String(error),
      durationMs: elapsed(start),
    };
  }
}

export async function runSystemDiagnostics({
  publicDir,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL,
  supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? DEFAULT_SUPABASE_ANON_KEY,
  fetchImpl = fetch,
}: DiagnosticsOptions): Promise<DiagnosticsResult> {
  const checks: DiagnosticCheck[] = [];

  checks.push(
    await runCheck("runtime", async () => {
      if (!process.version) throw new Error("Node.js no está disponible");
      return `Node ${process.version}`;
    })
  );

  checks.push(
    await runCheck("static-entrypoint", async () => {
      const indexPath = path.join(publicDir, "index.html");
      await fs.access(indexPath);
      return "index.html disponible";
    })
  );

  checks.push(
    await runCheck("supabase-auth", async () => {
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Faltan URL o clave pública de Supabase");
      }
      const response = await fetchImpl(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/health`, {
        method: "GET",
        headers: { apikey: supabaseAnonKey },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        throw new Error(`Supabase respondió HTTP ${response.status}`);
      }
      return `Supabase respondió HTTP ${response.status}`;
    })
  );

  return {
    checkedAt: new Date().toISOString(),
    ok: checks.every((check) => check.status === "ok"),
    checks,
  };
}

type CronUser = { isCron?: boolean; taskUid?: string };

async function persistDiagnosticRun(input: {
  taskUid: string;
  result: DiagnosticsResult;
  notified: boolean;
  errorMessage?: string;
}): Promise<void> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!serviceRoleKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY para guardar el historial del diagnóstico");
  }
  const response = await fetch(`${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL).replace(/\/$/, "")}/rest/v1/system_diagnostic_runs`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({
      task_uid: input.taskUid,
      checked_at: input.result.checkedAt,
      status: input.result.ok ? "ok" : "failed",
      checks: input.result.checks,
      notification_sent: input.notified,
      error_message: input.errorMessage ?? null,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new Error(`No se pudo guardar el diagnóstico (Supabase HTTP ${response.status})`);
  }
}

function cronOnly(user: CronUser | null | undefined): user is CronUser & {
  isCron: true;
  taskUid: string;
} {
  return user?.isCron === true && typeof user.taskUid === "string" && user.taskUid.length > 0;
}

export function createSystemDiagnosticsHandler(publicDir: string): RequestHandler {
  return async (request: Request, response: Response) => {
    let taskUid: string | null = null;
    try {
      const user = await sdk.authenticateRequest(request);
      if (!cronOnly(user)) {
        response.status(403).json({ error: "cron-only" });
        return;
      }
      taskUid = user.taskUid;

      const result = await runSystemDiagnostics({ publicDir });
      const failed = result.checks.filter((check) => check.status === "failed");
      const title = failed.length
        ? `PetFlow: ${failed.length} diagnóstico(s) con falla`
        : "PetFlow: diagnóstico automático correcto";
      const content = [
        `Fecha: ${result.checkedAt}`,
        `Estado: ${result.ok ? "OK" : "FALLA"}`,
        ...result.checks.map(
          (check) =>
            `- ${check.name}: ${check.status.toUpperCase()} — ${check.detail} (${check.durationMs} ms)`
        ),
      ].join("\n");
      const notified = await notifyOwner({ title, content });
      await persistDiagnosticRun({ taskUid, result, notified });
      const payload = { ...result, taskUid, notified };

      if (!notified) {
        response.status(502).json({ ...payload, error: "owner-notification-unavailable" });
        return;
      }
      response.status(result.ok ? 200 : 502).json(payload);
    } catch (error) {
      if (error instanceof TRPCError && error.code === "FORBIDDEN") {
        response.status(403).json({ error: "forbidden" });
        return;
      }
      response.status(500).json({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context: { url: request.originalUrl, taskUid },
        timestamp: new Date().toISOString(),
      });
    }
  };
}
