#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source /home/ubuntu/.user_env
pnpm check
pnpm vitest run lib/petflow-core.test.ts client/src/lib/petflow-core.test.ts lib/petflow-rules.test.ts lib/tickets.test.ts lib/supabase/client.test.ts
pnpm build
test -s dist/index.js
test -s dist/public/index.html
PORT=3100 node dist/index.js >/tmp/petflow-monitor.log 2>&1 &
pid=$!
cleanup() { kill "$pid" 2>/dev/null || true; }
trap cleanup EXIT
for _ in 1 2 3 4 5; do
  if curl -fsS http://127.0.0.1:3100/api/health >/tmp/petflow-health.json; then break; fi
  sleep 1
done
grep -q '"ok":true' /tmp/petflow-health.json
curl -fsS http://127.0.0.1:3100/ >/tmp/petflow-home.html
grep -q 'PetFlow' /tmp/petflow-home.html
cat /tmp/petflow-health.json
