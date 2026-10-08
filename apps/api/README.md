# API

Express 5/TypeScript, pg, Zod, session PostgreSQL, scrypt và rate limit. Root `.env` đọc im lặng; không dùng cấu hình dự án khác. DB phải tên `project_codex_dev` hoặc `project_codex_test`. API mặc định bind loopback 4100. Xem [root README](../../README.md) để setup DB/admin.

Từ root: `npm run dev:api`, `npm run db:migrate`, `npm run db:seed`, `npm run admin:bootstrap`. Build: `npm run build -w @project-codex/api`; chạy `npm run start -w @project-codex/api` (cần React build khi phục vụ UI). Khi đóng gói, giữ `db/migrations` cùng compiled API.

Endpoint/lỗi: [API contract](../../docs/api-contract.md). Admin mutations cần session, Origin, CSRF; cập nhật dùng version. Cookie HttpOnly/SameSite=Lax/Secure production. `TRUST_PROXY=loopback` chỉ cho HTTPS reverse proxy được tin trên loopback. Theo IP: login 10/15 phút, lead 20/15 phút, tạo phiên game 80/giờ.

`npm run test -w @project-codex/api` dùng TEST_DATABASE_URL, migrate/seed fixture và dọn ID riêng. Game không có endpoint tiết lộ deck; chỉ test đọc fixture DB trực tiếp. Dashboard đếm theo ngày gửi UTC+7, 7 ngày gồm bucket 0, không tính doanh thu.

Room Studio: catalog/validation tại `services/room.ts`, GET catalog/GET snapshot/POST snapshot tại `routes/rooms.ts`, bảng JSONB `room_designs` qua migration002. POST public cần Origin hợp lệ và UUID `Idempotency-Key`, giới hạn30/15 phút/IP. Validation strict, tối đa24 món và không chồng lấn/ra ngoài phòng; retry khóa theo key rồi so sánh hash. Không có endpoint sửa bản chia sẻ. `rooms.test.ts` kiểm tra DB thật và retry đồng thời.

Brick Playground: `services/brick-geometry.ts` chứa catalog/kiểu/geometry thuần, dùng chung với FE và không import Node/DB. `services/bricks.ts` strict-validate layout và lưu/đọc snapshot; `routes/bricks.ts` có GET catalog, POST designs, GET designs/:id. Migration004 tạo `brick_designs` và metadata thứ năm. Mỗi layout tối đa150 gạch, 10 loại/8 màu, đế32×32, cao48plate; không xuyên nhau, phải có điểm tựa. API từ chối gạch lơ lửng, không tự settle payload client. POST cần Origin và UUID key, giới hạn30/15 phút/IP; hash layout chuẩn hóa/sort UUID cùng advisory lock bảo đảm concurrent retry201/200, khác payload409. Viewer công khai bất biến, không có PATCH/DELETE/list. Body vượt32KB trả413 JSON an toàn.

`bricks-validation.test.ts`, `bricks-service.test.ts`, `bricks.test.ts` kiểm tra schema, database thật, concurrency, rollback/retry và HTTP errors/rate limit. SQL luôn tham số hóa; snapshot không chứa camera/selection/history/key.

Server áp dụng migration trước listen, kể cả source/dev hoặc dist/start. Migration003 thêm Room Studio,004 thêm Brick Playground, ON CONFLICT giữ metadata đã chỉnh. `portfolio-upgrade.test.ts` tạo schema fixture từ bản ba/bốn project hoặc metadata Room/Brick đã chỉnh, khởi động server thật không seed, kiểm tra API trả5 project và giữ dữ liệu. Migration001–003 không bị sửa trong PJ5.
