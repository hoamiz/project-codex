# Triển khai Vercel + Render Free + Neon Free

Ngày2026-10-13. Người dùng đã giao triển khai và push GitHub. Code/UI/config đã có; trạng thái kiểm tra và các bước public nằm trong [checklist D01–D14](../PORTFOLIO_TASKS.md), bằng chứng ở [verification](verification.md). Không coi file manifest hoặc kiểm tra container cục bộ là website đã được xuất bản.

## Kiến trúc và cấu hình

Vercel phục vụ `apps/web/dist` và Node Function `api/proxy.mjs`. Rewrite `/api/*` đi qua gateway của project; route trang dùng SPA fallback, asset thiếu trả404. Render chạy API trong Docker và Neon giữ database riêng theo môi trường. Frontend không cần backend để tải HTML/JS màn hình chờ.

Gateway không phải proxy tùy ý: upstream chỉ lấy từ `API_BACKEND_URL` của server, paths/size/method được kiểm tra, cookie và Origin/CSRF/game/idempotency headers được chuyển một lần. IP lấy từ `x-vercel-forwarded-for`; gateway thêm shared token, backend validate rồi thay forwarded headers trước session/limiter. Direct API requests vào Render thiếu token403, `/api/health` public cho hosting kiểm tra readiness. Health mang token sai bị từ chối để cấu hình gateway sai không bị nhận nhầm là ready.

| Nơi cấu hình    | Biến cần cấp                                                                                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel Function | `API_BACKEND_URL` là URL backend thực, `API_PROXY_SECRET`                                                                                                                                                            |
| Render API      | `DATABASE_URL`, `EXPECTED_DATABASE_NAME`, `DATABASE_SSL=verify-full`, `DATABASE_POOL_MAX=5`, `WEB_ORIGIN` là origin frontend HTTPS thực, `SESSION_SECRET`, `TRUST_PROXY=gateway`, `API_PROXY_SECRET`, `HOST=0.0.0.0` |
| Job/first boot  | `ADMIN_EMAIL`, `ADMIN_PASSWORD` riêng; `INITIALIZE_DEMO=1` nếu chọn first boot                                                                                                                                       |
| CI              | DB `project_codex_test`, secret tạm và Chromium; không có connection URL production                                                                                                                                  |

`API_PROXY_SECRET` phải cùng giá trị trên Vercel/Render, tối thiểu32 ký tự; nên tạo48 byte ngẫu nhiên. `SESSION_SECRET` riêng mỗi môi trường, tối thiểu32 ký tự và ổn định qua restart. Dùng secret manager của hosting, không biến `VITE_*`, không ghi trong JSON/YAML hoặc Git. Mẫu không có giá trị: [.env.production.example](../.env.production.example).

API production không đọc `.env` dev. Tên DB phải khớp `EXPECTED_DATABASE_NAME`; Neon có thể cấp `neondb`, không ép đổi tên database. Remote DB luôn TLS với certificate verification; `sslmode` trong URL không thể ghi đè thành insecure. Với CA riêng, cấp certificate public bằng `DATABASE_CA_CERT`. Ngoại lệ HTTP/dev DB chỉ tồn tại cho compiled verification loopback có cờ `ALLOW_LOCAL_HTTP=1`, không dùng cho website public.

## Quyền truy cập đang cần

Môi trường hiện đã dùng được GitHub repository. Trước khi tạo/publish hosting cần credential còn thiếu được cấp qua environment Settings:

- `VERCEL_TOKEN` dùng với `api.vercel.com`.
- `RENDER_API_KEY` dùng với `api.render.com`.
- `NEON_API_KEY` dùng với `console.neon.tech`.

Các yêu cầu đã lưu vào cloud draft và đọc lại xác nhận; chưa có giá trị trong runtime/local configuration. Repo GitHub secret metadata đọc bị403 nên không kết luận các repo secrets có/không. Không yêu cầu token qua chat; không lấy GitHub token dùng cho hosting khác. Nếu account/team có nhiều đích, chốt project/owner ID theo metadata trước tạo resource. Chỉ chọn free plans, không nâng cấp gói trả phí; kiểm tra hạn mức thực ở account trước thao tác.

## Thứ tự xuất bản

1. Push commit đã vượt kiểm tra; chờ workflow `Verify project-codex` đạt. CI dùng Node24, PG17 test, Playwright, lint/typecheck/build/unit/API/E2E/compiled, deploy proxy tests, format và container TLS/restore.
2. Tạo Neon project staging riêng với PostgreSQL17 và vùng gần Render (đề xuất Singapore nếu free account hỗ trợ). Lấy URL có xác thực/TLS từ provider; production sẽ là project/DB và secret riêng. Xác minh schema target trước migration.
3. Tạo Render web service từ `hoamiz/project-codex` ở commit đã kiểm tra, Dockerfile root, free plan, health `/api/health`, auto deploy tắt trong đợt đầu. Blueprint: [render.yaml](../render.yaml). Lấy URL thực từ Render, không đoán hostname theo tên service.
4. Tạo Vercel project từ root monorepo, framework Other, Node24; cấu hình theo [vercel.json](../vercel.json). Cấp upstream Render URL và shared secret cho đúng environment. Chốt production/staging origin thực từ provider; cập nhật `WEB_ORIGIN` tương ứng ở Render. Preview domain không tự có quyền ghi vào production API.
5. Khởi tạo DB theo một trong hai cách bên dưới; kiểm tra5 card/12 xe và account riêng. Sau initial deployment, tắt bootstrap và xóa admin bootstrap keys khỏi service configuration, redeploy. Không đổi session/proxy secret mỗi release.
6. Trên URL staging thật, nghiệm thu D10: cold start hosting thật, tất cả demo, auth/CSRF/cookie, snapshot sau redeploy và mobile/fallback. Fixture/mock delayed response trong E2E cục bộ không thay thế bước hosting thật này.
7. Hoàn thành backup/restore/rollback theo D11 và origin/HTTPS D12. Khi đủ bằng chứng, deploy cùng commit/image sang production độc lập, smoke read-only rồi ghi URL/release SHA/kết quả trong verification.

## Khởi tạo database

Job compiled được gọi từ root image/workspace có env production riêng:

```bash
node apps/api/dist/scripts/initialize.js
```

Lệnh validate admin trước ghi, migration001–005 có lock/checksum/transaction, seed chỉ thêm dữ liệu thiếu, admin ON CONFLICT không đổi password đã có. Không sửa SQL migration đã áp dụng. Không chạy test/E2E vào production.

Render Free không hỗ trợ đủ cơ chế shell/pre-deploy của gói trả phí. Có first boot trong `docker-entrypoint.sh`: cấp `INITIALIZE_DEMO=1` cùng admin keys một lần, initialization lỗi thì API không mở; job thành công thì entrypoint `unset` admin keys và `exec` API, server process không nhận password bootstrap. Xóa flag/admin keys ở Render sau lần đầu và redeploy. Nếu flag chưa xóa, rerun vẫn idempotent nhưng operator phải hoàn tất bước cleanup cấu hình. Không giữ tài khoản/mật khẩu phát triển trong production.

## Màn hình hồi phục

Lần đầu frontend chờ health trước mount app và gọi các query nghiệp vụ. HTTP200 phải là JSON app có `data.status=ok`, không chấp nhận HTML loading của hosting. Một request/lượt, timeout8 giây, retry khoảng5 giây+jitter, tổng120 giây. Khi ready tự vào đúng pathname/query/hash, không hard reload.

Sau khi đã vào app, offline/503/network error hiện banner và giữ cây component, draft/form/history. Hồi phục chỉ refetch active read queries, không replay mutation. Cooldown tránh vòng health→refetch endpoint lỗi→health. Quá hạn hiện retry; offline/visibility/unmount abort/dừng timers. Khi ready không polling nền để giữ Render/Neon luôn thức. Screen reader được thông báo trạng thái, elapsed clock không được đọc mỗi giây; có reduced motion.

## Lệnh kiểm tra và chứng cứ cục bộ

```bash
npm run check
npm run format:check
npm run test:deploy
npm run verify:container
```

`verify:container` tạo image/database/network tên UUID riêng, HTTPS frontend tĩnh và PostgreSQL TLS với CA fixture. Thử CA đúng/sai, initialize hai lần, gateway/direct403, Secure cookie, cả6 demo/alias/viewers và audio tiếng Việt, session/snapshot sau restart, dump/restore sang DB mới và so row digest/checksum. Không reset DB dev. Cuối lượt chỉ thu hồi container/network/image do mình tạo; key/env fixture bị xóa, backup test còn ở `.local` bị Git bỏ qua. Frontend certificate self-signed chỉ được bỏ kiểm tra trong fixture loopback; DB certificate vẫn verify thật, smoke public HTTPS không có cờ insecure.

Docker/buildx cache dùng `.local/docker` khi HOME cloud chỉ đọc. Helper truyền proxy mạng sẵn có bằng predefined build args và public CA qua BuildKit secret mount trong bước npm ci; không tắt TLS/integrity, không đưa CA build/credential vào runtime image. Node24 base image pin digest đã pull từ Docker Hub chính thức. Runtime chạy user `node`, manifest/output ownership đúng và dependency production.

Sau public deployment, kiểm tra đọc qua frontend:

```bash
npm run smoke:deploy -- https://your-real-frontend.vercel.app
```

Có thể cấp UUID sample đã có qua `ROOM_SNAPSHOT_ID`/`BRICK_SNAPSHOT_ID` để smoke viewer; thiếu ID thì output ghi viewer chưa được kiểm tra. Smoke không cần DB credential, không tự tạo/xóa lead/snapshot và không chạy mutation suite trên production.

## Backup và rollback

Container kiểm thử đã phục hồi backup thật vào DB mới và đối chiếu data/checksum; đây là kiểm tra quy trình cục bộ, chưa phải backup production. Gói Neon Free có giới hạn restore/history/snapshot; không cam kết retention7 ngày chỉ từ việc bật free project. D11 cần chốt và thử retention/backup phù hợp account, hoặc logical export tới kho private đã được cấp quyền. Không upload dump chứa lead/account/session vào repository hoặc artifact công khai.

Mỗi release ghi SHA/image, backup gần nhất và cách restore vào DB khác. Rollback app về commit đã kiểm tra chỉ khi schema tương thích; không tự down migration/drop/reset DB live. Theo dõi health/error/latency, DB connection/storage, quotas Vercel functions/Render hours/Neon compute và backup alerts. Free instance có cold start, limiter còn ở bộ nhớ một API process và reset khi restart; cần storage limiter dùng chung trước khi scale nhiều instance.

## Trạng thái bàn giao

Source/UI/config/container kiểm thử được bàn giao theo kết quả thực trong [verification](verification.md). Khi thiếu token hosting, D09–D14 giữ pending/blocker và chưa có URL public. Không đánh dấu staging/production, provider retention hoặc restore task mới hoàn thành bằng test localhost/container. Publish snapshot môi trường Codex vẫn là thao tác lưu môi trường phát triển, khác với website này.
