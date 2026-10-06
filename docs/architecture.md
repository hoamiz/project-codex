# Kiến trúc project-codex

Npm workspaces: `apps/web` (React/TypeScript/Vite/Tailwind, cổng 5173), `apps/api` (Express/TypeScript/pg, cổng 4100). React Router điều hướng, TanStack Query quản lý dữ liệu API. Vite proxy `/api` để cookie cùng origin. Production Express phục vụ web build với SPA fallback ngoài `/api` và asset.

PostgreSQL riêng tại `.local/pgdata`, loopback 55434; database `project_codex_dev` và `project_codex_test`. Root `.env` bị Git bỏ qua, chỉ đọc tên biến trong logs. Local trust auth chỉ cho môi trường phát triển cô lập này. Timestamps UTC; ngày nghiệp vụ Asia/Ho_Chi_Minh.

Migration SQL có checksum, lịch sử, advisory lock và transaction. Seed idempotent với ON CONFLICT DO NOTHING. Password admin băm scrypt; cookie HttpOnly, SameSite=Lax, Secure khi production; PostgreSQL session store; kiểm tra origin/CSRF và rate limit. Mỗi game có token riêng, deck chỉ ở backend, row lock cho lượt lật và kết quả lấy từ state.

Các biến: DATABASE_URL, TEST_DATABASE_URL, PORT, WEB_ORIGIN, SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD. Không tái sử dụng cấu hình/database của project khác. Scripts root đã có: dev, dev:web, dev:api, build, typecheck, lint, test, test:e2e, db:migrate, db:seed, admin:bootstrap.

Lifecycle: `npm run setup`, `services:start`, `services:stop`, `db:start`, `db:stop`, `smoke`, `verify:build`, `check`. Helper ghi PID/start ticks/command tuyệt đối để không dừng process bị tái dùng PID. Production chỉ tin HTTPS reverse proxy loopback khi `TRUST_PROXY=loopback`; mặc định không trust proxy.
