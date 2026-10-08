# Kiến trúc project-codex

Npm workspaces: `apps/web` (React/TypeScript/Vite/Tailwind, cổng 5173), `apps/api` (Express/TypeScript/pg, cổng 4100). React Router điều hướng, TanStack Query quản lý dữ liệu API. Vite proxy `/api` để cookie cùng origin. Production Express phục vụ web build với SPA fallback ngoài `/api` và asset.

PostgreSQL riêng tại `.local/pgdata`, loopback 55434; database `project_codex_dev` và `project_codex_test`. Root `.env` bị Git bỏ qua, chỉ đọc tên biến trong logs. Local trust auth chỉ cho môi trường phát triển cô lập này. Timestamps UTC; ngày nghiệp vụ Asia/Ho_Chi_Minh.

Migration SQL có checksum, lịch sử, advisory lock và transaction. Seed idempotent với ON CONFLICT DO NOTHING. Password admin băm scrypt; cookie HttpOnly, SameSite=Lax, Secure khi production; PostgreSQL session store; kiểm tra origin/CSRF và rate limit. Mỗi game có token riêng, deck chỉ ở backend, row lock cho lượt lật và kết quả lấy từ state.

Các biến: DATABASE_URL, TEST_DATABASE_URL, PORT, WEB_ORIGIN, SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD. Không tái sử dụng cấu hình/database của project khác. Scripts root đã có: dev, dev:web, dev:api, build, typecheck, lint, test, test:e2e, db:migrate, db:seed, admin:bootstrap.

Lifecycle: `npm run setup`, `services:start`, `services:stop`, `db:start`, `db:stop`, `smoke`, `verify:build`, `check`. Helper ghi PID/start ticks/command tuyệt đối để không dừng process bị tái dùng PID. Production chỉ tin HTTPS reverse proxy loopback khi `TRUST_PROXY=loopback`; mặc định không trust proxy.

Room Studio 3D bổ sung demo thứ tư tại `/projects/room-studio`; trang chia sẻ `/projects/room-studio/view/:id`. Router lazy-load toàn bộ Three.js/Fiber/Drei và CSS studio, không tải bundle 3D khi vào portfolio/ba demo cũ. Sáu model và kiến trúc phòng tạo bằng hình học, không phụ thuộc asset/CDN. Orthographic camera và raycast mặt sàn cho kéo đồ theo lưới; trạng thái preview chưa ghi nháp/history đến khi thả ở vị trí hợp lệ. History giới hạn40 bước; nháp v1 được validate khi đọc localStorage. Sơ đồ 2D là đường chỉnh sửa khi WebGL không khả dụng.

API catalog là nguồn kích thước chung. Backend strict-validate JSON layout và kiểm tra footprint/grid/collision độc lập với frontend. Migration002 mở whitelist URL, thêm `room_designs` với snapshot JSONB và key/hash; migration001 giữ nguyên. POST chỉ tạo bản mới; advisory transaction lock theo key bảo đảm retry đồng thời trả cùng UUID, payload khác409. Viewer chỉ đọc; tạo bản sao đưa layout vào editor rồi tiêu thụ navigation state một lần để reload tiếp tục dùng nháp đã chỉnh.

API startup chạy migration trước khi mở cổng; runner giữ lock/checksum/transaction và lỗi nâng cấp chặn listen. Migration003 đăng ký metadata Room Studio riêng với seed demo để DB đã dùng ba project tự nhận card khi nâng cấp source. Bản ghi cùng slug đã có giữ nguyên; không sửa001/002 hoặc reset DB.

Brick Playground 3D là demo thứ năm: `/projects/brick-playground` và viewer `/projects/brick-playground/view/:id`. Migration004 thêm metadata bằng ON CONFLICT DO NOTHING và bảng snapshot `brick_designs`; giữ whitelist bốn route cũ, không sửa migration001–003. Server nâng cấp DB ba/bốn project trước listen mà không phụ thuộc seed, giữ metadata người dùng đã chỉnh. Schema/test fixture và process nâng cấp riêng bảo vệ DB dev.

Catalog có10 loại/8 màu, đế32×32, tối đa150 gạch và cao48plate. FE/API dùng chung module thuần `apps/api/src/services/brick-geometry.ts`, không phụ thuộc Node/renderer/DB. Footprint nửa mở cho collision, xoay90°/270° đổi rộng/sâu, tiếp xúc mặt được phép. Điểm tựa là ít nhất một nút giao footprint tại mặt đáy; mọi chuỗi tựa phải xuống đế. Spawn tìm ô trống trên đế. Khi move/rotate/remove mất điểm tựa, settle deterministic theo độ cao/UUID giữ x/z và chỉ hạ gạch; FE ghi cả kết quả thành một command. API validate dữ liệu gửi đến và từ chối layout lơ lửng, không tự sửa layout.

Preview kéo dùng raycast lên mặt phẳng qua vị trí bắt đầu, giữ offset grab và snap; pointer capture cùng listeners xử lý rời canvas, Escape/cancel và thùng rác DOM bằng tọa độ viewport. Chỉ thả hợp lệ mới ghi history50/nháp. Orbit bị khóa khi kéo; đổi edit/orbit giữ Canvas/camera. Geometry/material cache được dispose khi unmount, studs instanced và demand render/DPR1,5 hạn chế tải. Router/scene lazy và smoke kiểm tra manifest lẫn request để portfolio không tải3D. Không WebGL/mất context chuyển sang2D có panel chỉnh/lưu, PNG chỉ có trong3D.

Nháp riêng v1 validate toàn bộ khi restore; lỗi JSON/version/storage không chặn thao tác trong phiên. Save lưu layout chuẩn hóa, sort UUID trước SHA256; PostgreSQL advisory transaction lock theo key giữ một snapshot cho retry đồng thời. Cùng key khác hash409, payload quá32KB413, ghi công khai cần Origin và30/15 phút/IP. Viewer bất biến; copy qua navigation state tiêu thụ một lần, xác nhận khi thay nháp. Chỉ local fixture smoke/test được xóa bằng query theo key riêng; không mở API xóa snapshot.
