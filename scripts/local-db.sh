#!/usr/bin/env bash
set -euo pipefail
root=$(cd "$(dirname "$0")/.."; pwd)
pg="${PG_BIN:-$root/.local/postgres/usr/lib/postgresql/17/bin}"
socket_opt="-k $root/.local/socket"
locale=C.UTF-8
init_share=(-L "$root/.local/postgres/usr/share/postgresql/17")
# Windows (Git Bash) không dùng được bản PostgreSQL Linux do setup.sh tải về; dùng bản cài đặt sẵn,
# bỏ unix socket và locale C.UTF-8 vì postgres.exe không hỗ trợ.
if [ -z "${PG_BIN:-}" ] && [ ! -f "$pg/pg_ctl" ]; then
 for dir in "/c/Program Files/PostgreSQL"/*/bin; do
  if [ -f "$dir/pg_ctl.exe" ]; then pg="$dir"; fi
 done
 socket_opt=""
 locale=C
 init_share=()
fi
if [ ! -f "$pg/pg_ctl" ] && [ ! -f "$pg/pg_ctl.exe" ]; then
 echo "PostgreSQL binaries not found. Run npm run setup, install PostgreSQL, or set PG_BIN." >&2
 exit 1
fi
if [ "${1:-start}" = stop ]; then
 if "$pg/pg_ctl" -D "$root/.local/pgdata" status >/dev/null 2>&1; then
  "$pg/pg_ctl" -D "$root/.local/pgdata" -m fast -w stop
 fi
 exit 0
fi
mkdir -p "$root/.local/logs" "$root/.local/socket"
if [ ! -f "$root/.local/pgdata/PG_VERSION" ]; then
 "$pg/initdb" -D "$root/.local/pgdata" "${init_share[@]}" --username=codex --auth-local=trust --auth-host=trust --encoding=UTF8 --locale=$locale
fi
if ! "$pg/pg_ctl" -D "$root/.local/pgdata" status >/dev/null 2>&1; then
 # Tách stdio khỏi caller: postmaster kế thừa handle nên nếu output bị pipe, caller sẽ chờ EOF mãi.
 if ! "$pg/pg_ctl" -D "$root/.local/pgdata" -l "$root/.local/logs/postgres.log" -o "-h 127.0.0.1 -p 55434 $socket_opt" -w start </dev/null >/dev/null 2>&1; then
  echo "PostgreSQL failed to start; see .local/logs/postgres.log" >&2
  tail -n 20 "$root/.local/logs/postgres.log" >&2
  exit 1
 fi
 echo "PostgreSQL started on 127.0.0.1:55434"
fi
for db in project_codex_dev project_codex_test; do
 exists=$("$pg/psql" -h 127.0.0.1 -p 55434 -U codex -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'")
 if [ "$exists" != 1 ]; then "$pg/createdb" -h 127.0.0.1 -p 55434 -U codex "$db"; fi
 "$pg/psql" -h 127.0.0.1 -p 55434 -U codex -d "$db" -tAc 'SELECT current_database(), 1 AS ready'
done
