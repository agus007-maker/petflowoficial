import process from "node:process";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://msrcjsrfwkolxlngvdvn.supabase.co").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!key) {
  console.error("Falta SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SECRET_KEY. Configurala sólo como secreto del entorno.");
  process.exit(2);
}

const headers = { apikey: key, authorization: `Bearer ${key}` };
const checks = [];

async function checkTable(name) {
  const response = await fetch(`${url}/rest/v1/${name}?select=id&limit=0`, { headers, signal: AbortSignal.timeout(10_000) });
  checks.push({ name, type: "table", status: response.ok ? "ok" : "failed", httpStatus: response.status });
}

async function checkFunction(name) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, { method: "OPTIONS", headers, signal: AbortSignal.timeout(10_000) });
  checks.push({ name, type: "rpc", status: response.status !== 404 ? "ok" : "failed", httpStatus: response.status });
}

await checkTable("cash_registers");
await checkTable("cash_movements");
await checkFunction("open_cash_register");
await checkFunction("add_cash_movement");
await checkFunction("close_cash_register");

const failed = checks.filter((check) => check.status === "failed");
console.log(JSON.stringify({ ok: failed.length === 0, projectUrl: url, checks }, null, 2));
if (failed.length) process.exit(1);
