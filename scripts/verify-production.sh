#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source /home/ubuntu/.user_env
pnpm check
pnpm vitest run server/supabase.vite-credentials.test.ts server/supabase.public-credentials.test.ts lib/supabase/client.test.ts lib/petflow-rules.test.ts lib/tickets.test.ts
pnpm build
test -s dist/public/index.html
PORT=3100 node dist/production.js >/tmp/petflow-production.log 2>&1 &
pid=$!
cleanup() { kill "$pid" 2>/dev/null || true; }
trap cleanup EXIT
sleep 2
curl -fsS -o /tmp/petflow-production.html -w 'HTTP %{http_code}\n' http://127.0.0.1:3100/
grep -q 'PetFlow' /tmp/petflow-production.html
grep -E 'production server' /tmp/petflow-production.log
