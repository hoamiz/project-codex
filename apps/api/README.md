# API

Express 5/TypeScript, pg, Zod, session PostgreSQL, scrypt và rate limit. Root `.env` đọc im lặng; không dùng cấu hình dự án khác. DB phải tên `project_codex_dev` hoặc `project_codex_test`. API mặc định bind loopback 4100. Xem [root README](../../README.md) để setup DB/admin.

Từ root: `npm run dev:api`, `npm run db:migrate`, `npm run db:seed`, `npm run admin:bootstrap`. Build: `npm run build -w @project-codex/api`; chạy `npm run start -w @project-codex/api` (cần React build khi phục vụ UI). Khi đóng gói, giữ `db/migrations` cùng compiled API.

Endpoint/lỗi: [API contract](../../docs/api-contract.md). Admin mutations cần session, Origin, CSRF; cập nhật dùng version. Cookie HttpOnly/SameSite=Lax/Secure production. `TRUST_PROXY=loopback` chỉ cho HTTPS reverse proxy được tin trên loopback. Theo IP: login 10/15 phút, lead 20/15 phút, tạo phiên game 80/giờ.

`npm run test -w @project-codex/api` dùng TEST_DATABASE_URL, migrate/seed fixture và dọn ID riêng. Game không có endpoint tiết lộ deck; chỉ test đọc fixture DB trực tiếp. Dashboard đếm theo ngày gửi UTC+7, 7 ngày gồm bucket 0, không tính doanh thu.

Room Studio: catalog/validation tại `services/room.ts`, GET catalog/GET snapshot/POST snapshot tại `routes/rooms.ts`, bảng JSONB `room_designs` qua migration002. POST public cần Origin hợp lệ và UUID `Idempotency-Key`, giới hạn30/15 phút/IP. Validation strict, tối đa24 món và không chồng lấn/ra ngoài phòng; retry khóa theo key rồi so sánh hash. Không có endpoint sửa bản chia sẻ. `rooms.test.ts` kiểm tra DB thật và retry đồng thời.
