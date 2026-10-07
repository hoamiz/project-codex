# Kiến trúc project-codex

Npm workspaces: `apps/web` (React/TypeScript/Vite/Tailwind, cổng 5173), `apps/api` (Express/TypeScript/pg, cổng 4100). React Router điều hướng, TanStack Query quản lý dữ liệu API. Vite proxy `/api` để cookie cùng origin. Production Express phục vụ web build với SPA fallback ngoài `/api` và asset.

PostgreSQL riêng tại `.local/pgdata`, loopback 55434; database `project_codex_dev` và `project_codex_test`. Root `.env` bị Git bỏ qua, chỉ đọc tên biến trong logs. Local trust auth chỉ cho môi trường phát triển cô lập này. Timestamps UTC; ngày nghiệp vụ Asia/Ho_Chi_Minh.

Migration SQL có checksum, lịch sử, advisory lock và transaction. Seed idempotent với ON CONFLICT DO NOTHING. Password admin băm scrypt; cookie HttpOnly, SameSite=Lax, Secure khi production; PostgreSQL session store; kiểm tra origin/CSRF và rate limit. Mỗi game có token riêng, deck chỉ ở backend, row lock cho lượt lật và kết quả lấy từ state.

Các biến: DATABASE_URL, TEST_DATABASE_URL, PORT, WEB_ORIGIN, SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD. Không tái sử dụng cấu hình/database của project khác. Scripts root đã có: dev, dev:web, dev:api, build, typecheck, lint, test, test:e2e, db:migrate, db:seed, admin:bootstrap.

Lifecycle: `npm run setup`, `services:start`, `services:stop`, `db:start`, `db:stop`, `smoke`, `verify:build`, `check`. Helper ghi PID/start ticks/command tuyệt đối để không dừng process bị tái dùng PID. Production chỉ tin HTTPS reverse proxy loopback khi `TRUST_PROXY=loopback`; mặc định không trust proxy.

Room Studio 3D bổ sung demo thứ tư tại `/projects/room-studio`; trang chia sẻ `/projects/room-studio/view/:id`. Router lazy-load toàn bộ Three.js/Fiber/Drei và CSS studio, không tải bundle 3D khi vào portfolio/ba demo cũ. Sáu model và kiến trúc phòng tạo bằng hình học, không phụ thuộc asset/CDN. Orthographic camera và raycast mặt sàn cho kéo đồ theo lưới; trạng thái preview chưa ghi nháp/history đến khi thả ở vị trí hợp lệ. History giới hạn40 bước; nháp v1 được validate khi đọc localStorage. Sơ đồ 2D là đường chỉnh sửa khi WebGL không khả dụng.

API catalog là nguồn kích thước chung. Backend strict-validate JSON layout và kiểm tra footprint/grid/collision độc lập với frontend. Migration002 mở whitelist URL, thêm `room_designs` với snapshot JSONB và key/hash; migration001 giữ nguyên. POST chỉ tạo bản mới; advisory transaction lock theo key bảo đảm retry đồng thời trả cùng UUID, payload khác409. Viewer chỉ đọc; tạo bản sao đưa layout vào editor rồi tiêu thụ navigation state một lần để reload tiếp tục dùng nháp đã chỉnh.
