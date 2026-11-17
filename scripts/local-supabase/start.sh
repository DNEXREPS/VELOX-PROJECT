#!/usr/bin/env bash
# Local Supabase-compatible stack for development and automated auth tests (NOT production).
#   PostgreSQL 16 (throwaway cluster) · GoTrue (supabase/gotrue) · PostgREST · gateway + SMTP sink
# Usage: scripts/local-supabase/start.sh  → writes scripts/local-supabase/.env.local-stack
#        scripts/local-supabase/stop.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
STATE="${VELOX_STACK_DIR:-/tmp/velox-local-stack}"
PG_PORT=54322
SITE_URL="${SITE_URL:-http://localhost:3100}"
JWT_SECRET="velox-local-only-jwt-secret-at-least-32-characters"
PGBIN="$(ls -d /usr/lib/postgresql/*/bin | head -1)"

mkdir -p "$STATE"; chown postgres "$STATE"
if [ ! -d "$STATE/data" ]; then
  su postgres -c "$PGBIN/initdb -D $STATE/data -A trust >/dev/null"
fi
su postgres -c "$PGBIN/pg_ctl -D $STATE/data -o '-p $PG_PORT -k $STATE -c listen_addresses=127.0.0.1' -l $STATE/pg.log start" >/dev/null
for i in $(seq 1 30); do su postgres -c "psql -h $STATE -p $PG_PORT -c 'select 1'" >/dev/null 2>&1 && break; sleep 0.5; done

PSQL="psql -h $STATE -p $PG_PORT -U postgres -v ON_ERROR_STOP=1 -q"
su postgres -c "$PSQL" <<'SQL'
do $$ begin
  if not exists (select from pg_roles where rolname='anon') then create role anon nologin noinherit; end if;
  if not exists (select from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select from pg_roles where rolname='service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select from pg_roles where rolname='authenticator') then create role authenticator login password 'authenticator' noinherit; end if;
  if not exists (select from pg_roles where rolname='supabase_auth_admin') then create role supabase_auth_admin login password 'authadmin' createrole; end if;
end $$;
grant anon, authenticated, service_role to authenticator;
create schema if not exists auth authorization supabase_auth_admin;
grant usage on schema auth to anon, authenticated, service_role, postgres;
grant all on database postgres to supabase_auth_admin;
create extension if not exists pgcrypto;
SQL

docker rm -f velox-gotrue velox-postgrest >/dev/null 2>&1 || true
docker run -d --name velox-gotrue --network host \
  -e GOTRUE_API_HOST=127.0.0.1 -e PORT=9999 -e API_EXTERNAL_URL=http://localhost:54321/auth/v1 \
  -e GOTRUE_DB_DRIVER=postgres -e GOTRUE_DB_DATABASE_URL="postgres://supabase_auth_admin:authadmin@127.0.0.1:$PG_PORT/postgres?search_path=auth" \
  -e GOTRUE_SITE_URL="$SITE_URL" -e GOTRUE_URI_ALLOW_LIST="$SITE_URL/**" \
  -e GOTRUE_JWT_SECRET="$JWT_SECRET" -e GOTRUE_JWT_EXP=3600 -e GOTRUE_JWT_AUD=authenticated -e GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated -e GOTRUE_JWT_ADMIN_ROLES=service_role \
  -e GOTRUE_DISABLE_SIGNUP=false -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true -e GOTRUE_MAILER_AUTOCONFIRM=false -e GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED=true \
  -e GOTRUE_SMTP_HOST=127.0.0.1 -e GOTRUE_SMTP_PORT=1025 -e GOTRUE_SMTP_USER=velox -e GOTRUE_SMTP_PASS=velox -e GOTRUE_SMTP_ADMIN_EMAIL=noreply@velox.local -e GOTRUE_SMTP_SENDER_NAME=VELOX \
  -e GOTRUE_MAILER_URLPATHS_CONFIRMATION=/auth/v1/verify -e GOTRUE_MAILER_URLPATHS_RECOVERY=/auth/v1/verify -e GOTRUE_MAILER_URLPATHS_INVITE=/auth/v1/verify -e GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE=/auth/v1/verify \
  -e GOTRUE_PASSWORD_MIN_LENGTH=8 -e GOTRUE_RATE_LIMIT_EMAIL_SENT=1000 -e GOTRUE_EXTERNAL_GOOGLE_ENABLED=false \
  supabase/gotrue:v2.170.0 >/dev/null

# gateway + SMTP sink (GoTrue needs the SMTP port at send time)
pkill -f "local-supabase/gateway.mjs" >/dev/null 2>&1 || true
nohup node "$HERE/gateway.mjs" > "$STATE/gateway.log" 2>&1 &

# wait for GoTrue migrations (auth.users) then apply the VELOX schema
for i in $(seq 1 60); do
  su postgres -c "$PSQL -tAc \"select to_regclass('auth.users') is not null and exists (select 1 from pg_proc where proname='uid')\"" 2>/dev/null | grep -q t && break; sleep 1
done
if ! su postgres -c "$PSQL -tAc \"select to_regclass('public.user_collections') is not null\"" | grep -q t; then
  su postgres -c "$PSQL -f $ROOT/supabase/schema.sql" >/dev/null
fi

docker run -d --name velox-postgrest --network host \
  -e PGRST_DB_URI="postgres://authenticator:authenticator@127.0.0.1:$PG_PORT/postgres" -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon \
  -e PGRST_JWT_SECRET="$JWT_SECRET" -e PGRST_SERVER_PORT=3001 -e PGRST_DB_CHANNEL_ENABLED=false \
  postgrest/postgrest:v12.2.3 >/dev/null

ANON=$(node -e '
const c=require("crypto");const s=process.argv[1];const b=o=>Buffer.from(JSON.stringify(o)).toString("base64url");
const t=(p)=>{const h=b({alg:"HS256",typ:"JWT"}),q=b(p);return h+"."+q+"."+c.createHmac("sha256",s).update(h+"."+q).digest("base64url")};
console.log(t({iss:"supabase-local",role:"anon",iat:1700000000,exp:2000000000}))' "$JWT_SECRET")
cat > "$HERE/.env.local-stack" <<ENV
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON
NEXT_PUBLIC_SITE_URL=$SITE_URL
NEXT_PUBLIC_AUTH_GOOGLE=false
ENV
for i in $(seq 1 40); do curl -sf http://localhost:54321/auth/v1/health >/dev/null && curl -sf -H "apikey: $ANON" "http://localhost:54321/rest/v1/" >/dev/null && break; sleep 1; done
curl -s http://localhost:54321/auth/v1/health; echo
echo "local stack ready — env in $HERE/.env.local-stack"
