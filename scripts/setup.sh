#!/usr/bin/env bash
set -euo pipefail
umask 077
root=$(cd "$(dirname "$0")/.."; pwd)
cd "$root"
node -e 'if(Number(process.versions.node.split(".")[0])<24)throw new Error("Node >=24 required")'
state="$root/.local"
mkdir -p "$state/logs" "$state/apt/lists/partial" "$state/apt/archives/partial" "$state/postgres"
pg="$state/postgres/usr/lib/postgresql/17/bin"
# APT kiểm tra chữ ký metadata và checksum package; không sửa cấu hình hệ thống.
if [ ! -x "$pg/postgres" ]; then
  cat > "$state/apt/sources.list" <<'SOURCES'
deb [signed-by=/usr/share/keyrings/debian-archive-keyring.gpg] https://deb.debian.org/debian trixie main
deb [signed-by=/usr/share/keyrings/debian-archive-keyring.gpg] https://deb.debian.org/debian-security trixie-security main
SOURCES
  apt_options=(-o Dir::Etc::parts=- -o Dir::Etc::sourcelist="$state/apt/sources.list" -o Dir::Etc::sourceparts=- -o Dir::State::lists="$state/apt/lists" -o Dir::Cache::archives="$state/apt/archives" -o APT::Sandbox::User="$(id -un)")
  /usr/bin/apt-get "${apt_options[@]}" update
  (cd "$state/apt/archives"; /usr/bin/apt-get "${apt_options[@]}" download postgresql-17 postgresql-client-17)
  for archive in "$state"/apt/archives/postgresql*.deb; do dpkg-deb -x "$archive" "$state/postgres"; done
fi
"$pg/postgres" --version
node scripts/init-config.mjs
npm ci --no-audit --no-fund --cache "$state/npm-cache"
bash scripts/local-db.sh
npm run db:migrate
npm run db:seed
npm run admin:bootstrap
test -x "${CHROMIUM_PATH:-/usr/bin/chromium}" || { echo 'Set CHROMIUM_PATH to an installed Chromium binary for browser checks.' >&2; exit 1; }
