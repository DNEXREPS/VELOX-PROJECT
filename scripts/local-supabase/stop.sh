#!/usr/bin/env bash
# Stops the local test stack and deletes its throwaway database.
STATE="${VELOX_STACK_DIR:-/tmp/velox-local-stack}"
PGBIN="$(ls -d /usr/lib/postgresql/*/bin | head -1)"
docker rm -f velox-gotrue velox-postgrest >/dev/null 2>&1 || true
pkill -f "local-supabase/gateway.mjs" >/dev/null 2>&1 || true
[ -d "$STATE/data" ] && su postgres -c "$PGBIN/pg_ctl -D $STATE/data stop -m fast" >/dev/null 2>&1 || true
rm -rf "$STATE"
echo "local stack stopped"
