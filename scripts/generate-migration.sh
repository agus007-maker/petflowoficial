#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ -z "${SUPABASE_DATABASE_URL:-}" && -z "${DATABASE_URL:-}" ]]; then
  echo "Falta SUPABASE_DATABASE_URL (o DATABASE_URL) para ejecutar Drizzle Kit." >&2
  exit 1
fi

pnpm drizzle-kit generate --config=drizzle.config.ts
latest_migration="$(find drizzle/supabase -maxdepth 1 -type f -name '*.sql' -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)"
if [[ -n "${latest_migration}" ]]; then
  echo "Migración generada: ${latest_migration}"
fi
