#!/bin/sh
set -eu

# Chỉ bật cho lần deploy đầu trên Render Free; job idempotent và lỗi sẽ chặn mở API.
if [ "${INITIALIZE_DEMO:-0}" = "1" ]; then
  node apps/api/dist/scripts/initialize.js
fi

# Server không cần credential bootstrap; exec thay process và bỏ chúng khỏi môi trường API.
unset ADMIN_EMAIL ADMIN_PASSWORD INITIALIZE_DEMO
exec node apps/api/dist/server.js
