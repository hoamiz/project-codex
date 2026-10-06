#!/usr/bin/env bash
set -euo pipefail
root=$(cd "$(dirname "$0")/.."; pwd)
pg="$root/.local/postgres/usr/lib/postgresql/17/bin"
if [ "${1:-start}" = stop ]; then
 if "$pg/pg_ctl" -D "$root/.local/pgdata" status >/dev/null 2>&1; then
  "$pg/pg_ctl" -D "$root/.local/pgdata" -m fast -w stop
 fi
 exit 0
fi
mkdir -p "$root/.local/logs" "$root/.local/socket"
if [ ! -f "$root/.local/pgdata/PG_VERSION" ]; then
 "$pg/initdb" -D "$root/.local/pgdata" -L "$root/.local/postgres/usr/share/postgresql/17" --username=codex --auth-local=trust --auth-host=trust --encoding=UTF8 --locale=C.UTF-8
fi
if ! "$pg/pg_ctl" -D "$root/.local/pgdata" status >/dev/null 2>&1; then
 "$pg/pg_ctl" -D "$root/.local/pgdata" -l "$root/.local/logs/postgres.log" -o "-h 127.0.0.1 -p 55434 -k $root/.local/socket" -w start
fi
for db in project_codex_dev project_codex_test; do
 exists=$("$pg/psql" -h 127.0.0.1 -p 55434 -U codex -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'")
 if [ "$exists" != 1 ]; then "$pg/createdb" -h 127.0.0.1 -p 55434 -U codex "$db"; fi
 "$pg/psql" -h 127.0.0.1 -p 55434 -U codex -d "$db" -tAc 'SELECT current_database(), 1 AS ready'
done
