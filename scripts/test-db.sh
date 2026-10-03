#!/usr/bin/env bash
# Applies supabase/migrations to a throwaway local Postgres (with a minimal
# Supabase stub) and runs the policy tests. Needs Postgres 15+ binaries.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(dirname "$(command -v initdb 2>/dev/null || ls -d /usr/lib/postgresql/*/bin/initdb | tail -1)")}"
DATA="$(mktemp -d)"
PORT="${PGTEST_PORT:-54329}"
trap '"$PG_BIN/pg_ctl" -D "$DATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DATA"' EXIT

if [ "$(id -u)" = 0 ]; then
  echo "Run as a non-root user (Postgres refuses to run as root)." >&2
  exit 1
fi

"$PG_BIN/initdb" -D "$DATA" -U postgres -A trust >/dev/null
"$PG_BIN/pg_ctl" -D "$DATA" -o "-p $PORT -k $DATA -c listen_addresses=''" -l "$DATA/log" start -w >/dev/null

PSQL=("$PG_BIN/psql" -h "$DATA" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -At)
"${PSQL[@]}" -f "$ROOT/supabase/tests/supabase-stub.sql"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  "${PSQL[@]}" -f "$migration"
done
"${PSQL[@]}" -f "$ROOT/supabase/tests/policies.test.sql" 2>&1 | sed -e "s/^psql:[^ ]* NOTICE:  /  /" -e "/^\s*$/d"
