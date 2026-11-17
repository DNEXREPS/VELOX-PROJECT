#!/usr/bin/env bash
# Apply supabase/migrations/*.sql in order, once each, recording them in velox_migrations.
# Usage: scripts/local-supabase/migrate.sh [database]   (default: postgres — the LOCAL stack only)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
STATE="${VELOX_STACK_DIR:-/tmp/velox-local-stack}"; DB="${1:-postgres}"
PSQL="env PGOPTIONS=--client-min-messages=warning psql -h $STATE -p 54322 -U postgres -d $DB -v ON_ERROR_STOP=1 -q"
su postgres -c "$PSQL -c 'create table if not exists velox_migrations (name text primary key, applied_at timestamptz not null default now())'"
for f in "$ROOT"/supabase/migrations/*.sql; do
  n="$(basename "$f")"
  if su postgres -c "$PSQL -tAc \"select 1 from velox_migrations where name = '$n'\"" | grep -q 1; then continue; fi
  echo "applying $n to $DB"
  su postgres -c "$PSQL -1 -f $f -c \"insert into velox_migrations(name) values ('$n')\""
done
# PostgREST caches the schema; ask it to reload (ignored when it is not running)
su postgres -c "$PSQL -c \"notify pgrst, 'reload schema'\"" >/dev/null 2>&1 || true
# the local PostgREST runs with the notification channel disabled: restart it so new tables/functions are visible
if command -v docker >/dev/null && docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^velox-postgrest$'; then docker restart velox-postgrest >/dev/null; sleep 2; fi
