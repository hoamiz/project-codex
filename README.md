# project-codex

Portfolio độc lập với **React 19 + TypeScript + Vite 8 + Tailwind CSS 4**, **Node.js + Express 5** và **PostgreSQL 17**. Tiến độ T01–T33 nằm trong [PORTFOLIO_TASKS.md](PORTFOLIO_TASKS.md).

| Trang | Đường dẫn | Chức năng |
| --- | --- | --- |
| Portfolio | `/` | Giới thiệu, stack và bốn project từ PostgreSQL |
| AutoHub | `/projects/autohub` | Lọc/chi tiết xe, yêu thích, so sánh tối đa 3 xe, tư vấn/lái thử |
| Memory Match | `/projects/memory-match` | 6/8/12 cặp, phục hồi sau reload, kết quả và leaderboard |
| Control Center | `/projects/admin` | Đăng nhập, dashboard, CRUD/archive xe và quản lý yêu cầu |
| Room Studio 3D | `/projects/room-studio` | Custom phòng 3D, nội thất, màu/ánh sáng, lưu và chia sẻ |

## Room Studio 3D

Phòng 6 × 5 m với sáu loại nội thất và tối đa 24 món. Thêm/chọn/kéo đồ theo lưới 0,25 m, xoay 90°, đổi màu hoặc xóa; vị trí ngoài phòng/chồng nhau bị từ chối. Có undo/redo, ba bảng màu, màu tường/sàn tùy chọn, ánh sáng ngày/đêm, xoay/zoom camera và tải ảnh PNG. Thử thách nhỏ: tạo góc làm việc có bàn, ghế, đèn và tối đa 5 món.

Chọn món trong danh sách rồi dùng phím mũi tên để dịch chuyển, **R** xoay, **Delete** xóa; **Ctrl/⌘+Z** hoàn tác, thêm **Shift** để làm lại. Phòng mẫu/làm trống có xác nhận và có thể hoàn tác. Mobile dùng tab nội thất/chỉnh sửa. Nếu WebGL không hoạt động, sơ đồ 2D vẫn cho chọn đồ và chỉnh qua bảng điều khiển.

Nháp tự lưu trên trình duyệt. **Lưu & chia sẻ** tạo snapshot công khai trong PostgreSQL và URL `/projects/room-studio/view/:id` chỉ để xem; các chỉnh sửa sau cần lưu thành bản mới. Người xem có thể tạo bản sao để chỉnh mà giữ bản gốc. Hình học tạo trong code, không tải model/font bên ngoài. Three.js/React Three Fiber/Drei chỉ tải khi mở studio. Hợp đồng và checklist: [kế hoạch PJ4](docs/room-studio-plan.md).

Đường dẫn `/projects/rooms` cũng được hỗ trợ và tự chuyển sang `/projects/room-studio`, giữ query/hash. Card Room Studio trên trang portfolio `/` dẫn tới URL chính này.

## Giao diện AutoHub

AutoHub tham khảo bố cục marketplace của [Carmudi](https://www.carmudi.vn/): theme xanh/cam, header/footer riêng, bộ lọc bên trái trên desktop và thu gọn trên mobile, lựa chọn nhanh theo hãng, giá bán nổi bật và hướng dẫn mua xe. Danh sách, chi tiết và so sánh xe dùng cùng theme; giữ ảnh SVG nguyên bản. Bộ lọc nằm trong URL, có thể bỏ từng điều kiện hoặc xóa toàn bộ mà giữ thứ tự sắp xếp. Yêu thích, so sánh tối đa 3 xe và yêu cầu tư vấn/lái thử tiếp tục dùng các luồng hiện có.

## Setup trong cloud hiện tại

Yêu cầu: Node.js **>=24**, npm, Debian 13/Linux với thư viện hệ thống PostgreSQL và Chromium tại `/usr/bin/chromium` (hoặc đặt `CHROMIUM_PATH` đến binary đã cài). Setup tải PostgreSQL từ Debian bằng APT có chữ ký và giải nén vào `.local`; không sửa PostgreSQL hệ thống.

```bash
cd /workspace/project-codex
npm run setup
npm run services:start
```

`setup` dùng `npm ci`, tạo `.env` quyền `600` chỉ khi chưa tồn tại, khởi động DB riêng, migration, seed và bootstrap admin. Secret/password phát triển được tạo ngẫu nhiên; xem tài khoản trong `.env` bằng editor cục bộ, không chia sẻ file. `.env.example` không chứa secret; không dùng file mẫu với secret trống để chạy app.

`services:start` chạy FE **5173**, API **4100** và PostgreSQL **55434**, ghi PID/command/thời điểm tạo process vào `.local/services.json`, log vào `.local/logs`. Readiness kiểm tra JSON từ DB, quyền admin và bốn trang render trong Chromium, gồm reload URL trực tiếp. Nếu cổng bị process khác chiếm, script báo lỗi và giữ process đó.

```bash
npm run smoke
npm run services:stop
npm run db:stop
npm run services:start
```

Helper chỉ dừng process mình tạo còn đúng identity; không xóa dữ liệu. Start cũng khởi động lại DB đã dừng. Local trust auth chỉ dành cho instance phát triển bind loopback, không dùng cho database public/production.

API chạy các migration chưa áp dụng trước khi mở cổng. Khi cập nhật từ bản chỉ có ba project, migration003 bổ sung card Room Studio mà không cần seed lại và không ghi đè metadata đã chỉnh. Migration lỗi thì API dừng khởi động; kiểm tra bằng `npm run db:migrate`.

Muốn chạy foreground, dừng dịch vụ background rồi dùng `npm run db:start` và `npm run dev`. Có thể chạy từng workspace với `dev:web` và `dev:api`. Vite proxy `/api` nên cookie cùng origin. Cổng test riêng: web **5174**, API **4110**; kiểm tra build dùng **4111**.

## Database và admin

- Dev: `project_codex_dev`; test: `project_codex_test`. Runner kiểm tra tên DB và chỉ dùng URL test; dọn fixture theo ID, không reset dev.
- `npm run db:migrate`: SQL transaction, advisory lock, lịch sử/checksum; tái chạy an toàn. Không sửa migration đã áp dụng; thêm migration mới.
- `npm run db:seed`: thêm 4 project/12 xe chưa có, giữ dữ liệu đã chỉnh. Không tự tạo lead hay password cố định.
- `npm run admin:bootstrap`: thêm admin từ `ADMIN_EMAIL`/`ADMIN_PASSWORD`, không ghi đè tài khoản đã tồn tại. Password lưu hash scrypt. Thêm tài khoản dev khác bằng email/password mới rồi bootstrap; đổi `.env` không tự đổi password trong DB.
- Giá là số nguyên VND. Thống kê/lái thử theo `Asia/Ho_Chi_Minh` (UTC+7), timestamp lưu UTC.
- Lead dùng `Idempotency-Key` để retry không nhân đôi. Game tính từ state server, token riêng, transaction lock và unique kết quả/phiên.
- Room Studio dùng layout JSONB v1, kiểm tra catalog/grid/footprint/collision ở API; `Idempotency-Key` và transaction lock giữ snapshot không trùng khi retry đồng thời. Lưu công khai giới hạn30 lần/15 phút/IP.

## Kiểm tra

```bash
npm run check
```

Chạy lint → typecheck FE/API → build FE/API → unit/component/integration → Playwright E2E → compiled server/SPA. Các lệnh riêng: `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run test:e2e`, `npm run verify:build`, `npm run format:check`.

Playwright migrate/seed/bootstrap DB test, chạy/dọn API và web test. Không chạy đồng thời nhiều bộ integration trên cùng DB. Artifact mới ở `.local/logs`, `test-results`; dùng console reporter và tắt trace auth vì HTML step có thể chứa giá trị nhập mật khẩu.

Kết quả trong [docs/verification.md](docs/verification.md): nghiệm thu T01–T33 đạt 23 API + 3 web; cập nhật AutoHub ngày 2026-10-07 đạt 3 web và **12 E2E**, gồm Playwright + axe cho danh sách/chi tiết/so sánh tại 360/768/1440px và kiểm tra bản build chạy thực tế. Scan tự động không thay cho đánh giá accessibility toàn diện bởi người dùng.

Nghiệm thu PJ4 Room Studio ngày2026-10-07: `npm run check` đạt **26 API + 8 web + 19 E2E**, 0 fail/skip. Bao gồm WebGL thật/kéo thả/xoay camera/PNG, fallback2D, history/draft, retry lưu vào DB/chia sẻ/copy, mobile/axe và hồi quy ba demo cũ. Build smoke xác minh bundle3D chưa tải trên portfolio và tải khi mở studio.

## Bản build

```bash
npm run build
npm run start -w @project-codex/api
```

Express phục vụ `apps/web/dist` cùng API. Trang dùng SPA fallback; API/asset thiếu vẫn 404. Dừng API dev cùng cổng trước khi chạy. `verify:build` dùng cổng riêng, kiểm tra render/direct URL và cookie production sau HTTPS proxy giả lập, tự dọn process.

Production cần cấu hình riêng, secret mạnh, DB có xác thực, `NODE_ENV=production`, `WEB_ORIGIN` đúng HTTPS origin. Nếu reverse proxy HTTPS chạy loopback, đặt `TRUST_PROXY=loopback` để cookie Secure hoạt động; không tin proxy tùy ý. Đây là hướng dẫn, chưa deploy.

## Cấu trúc và nội dung

```text
apps/web/src/features/       Portfolio, AutoHub, game, admin và room-studio/
apps/web/public/images/     SVG nguyên bản và SOURCES.md
apps/api/src/routes/        REST API public/auth/admin/game/rooms
apps/api/src/services/      Game, room catalog/validation, migration, seed, password
apps/api/db/migrations/     SQL có version
tests/e2e/                  Luồng người dùng với PostgreSQL test
scripts/                    Setup, DB, service ownership, smoke/build check
```

Sửa `profile` trong `apps/web/src/features/portfolio.tsx` để cá nhân hóa. Metadata nằm trong seed/DB; seed không ghi đè bản cũ. Xe dùng ảnh vector minh họa nguyên bản. Admin chọn ảnh tĩnh trong 12 mẫu; chưa có upload. Không gửi email/thanh toán thật. JSDoc tiếng Việt giải thích nghiệp vụ, auth và transaction theo [AGENTS.md](AGENTS.md).

Tài liệu: [web](apps/web/README.md), [API](apps/api/README.md), [kiến trúc](docs/architecture.md), [API contract](docs/api-contract.md), [prompt chạy task](RUN_ALL_TASKS.md).

## Cloud

T33 bổ sung setup/start riêng cho project-codex vào bản nháp `install_script`/`start_skill`, giữ cấu hình repository khác. Kiểm tra project này không gọi script của project cũ. Review/lưu và publish trong cài đặt môi trường khi muốn tái sử dụng snapshot. Chưa publish/deploy hoặc kiểm chứng restore ở task mới. Remote `origin` trỏ tới `https://github.com/hoamiz/project-codex.git`; các lần cập nhật GitHub theo yêu cầu người dùng được ghi trong [nhật ký nghiệm thu](docs/verification.md). Repository public; cấu hình/secret/database cục bộ không được đưa lên GitHub.

Room Studio 3D đã được cập nhật lên nhánh `main` ngày2026-10-07 theo yêu cầu riêng, commit tính năng `14886e2`. Source, migration002, lockfile, test và tài liệu đều có trên GitHub; các artifact cục bộ được loại trừ.
