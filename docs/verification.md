# Nhật ký nghiệm thu

2026-10-06, `/workspace/project-codex`; Node 24.19.0/npm 11.9.0, PostgreSQL17, Chromium. Fixture chỉ thuộc `project_codex_test`; dev giữ dữ liệu. Không sử dụng app/database của repository khác.

## T01–T30

[Checklist](../PORTFOLIO_TASKS.md) ghi kết quả sau mỗi task. Bảng bổ sung file và ánh xạ kiểm tra thực tế; bộ cuối xác minh lại sau khi nối toàn ứng dụng.

| Task    | File chính                     | Kiểm tra đã chạy                                                                 |
| ------- | ------------------------------ | -------------------------------------------------------------------------------- |
| T01     | docs architecture/API          | Runtime, DB riêng current_database(),1                                           |
| T02     | web package, Vite/TS, main.tsx | FE typecheck/build, router/dev browser                                           |
| T03     | API config/server/app          | Typecheck/build, health, compiled startup                                        |
| T04–T05 | migrations.ts, 001_initial.sql | database.test: idempotent/rollback/constraint/FK                                 |
| T06     | seed.ts, public/images         | Seed hai lần: 3 project/12 xe, giữ chỉnh sửa                                     |
| T07     | components/ui.tsx/styles       | ui.test: focus/Escape/pagination                                                 |
| T08–T09 | public routes/portfolio.tsx    | public.test; browser card/navigation; E2E 3 card                                 |
| T10–T11 | public routes/autohub.tsx      | API filter/sort/page/empty/archived; browser query; E2E filter/reload            |
| T12–T13 | detail/by-ids/gallery          | API detail/404/giá number; browser gallery/URL                                   |
| T14–T15 | leads route/lead-form.tsx      | leads.test: validation/idempotency; E2E form/DB                                  |
| T16     | storage/compare UI             | Browser limit3/favorite; E2E persistence/compare/reload                          |
| T17–T18 | auth/password/bootstrap/UI     | admin.test/password.test; E2E login/reload/logout/expire                         |
| T19–T21 | admin cars route/UI            | API CRUD/409/archive giữ lead; E2E form/giá/public/archive                       |
| T22–T23 | admin leads route/UI           | API filter/status/conflict/contact giữ nguyên; E2E detail/update/DB              |
| T24–T25 | stats route/dashboard          | API UTC+7/7 bucket/zero; browser dashboard/axe                                   |
| T26     | services/game.ts               | game.test: 3 độ khó/match/mismatch/lượt/server clock                             |
| T27–T28 | game routes/UI                 | API token/expire/concurrent409/hidden faces; E2E keyboard/reload/cooldown/finish |
| T29–T30 | results/leaderboard/UI         | API finish/unique/idempotent/ranking; E2E nickname escape/lưu/reload             |

## T31–T32

- Lint đạt 0 warning; typecheck/build FE/API đạt.
- `npm test`: **23 API + 3 web = 26 test đạt**, 0 fail/skip; 8 API và 2 web file.
- `npm run test:e2e`: **10/10 đạt**, 0 fail/skip. Portfolio→xe→lead→admin với DB thật; CRUD/archive phản ánh public; session hết hạn; favorite/compare; game cặp sai/keyboard/phục hồi/lưu leaderboard.
- Playwright + axe tại **360/768/1440px**: `/`, AutoHub, game, login, dashboard/cars/leads admin không tràn ngang và không violation thuộc bộ WCAG2A/AA/2.1AA đã scan. Modal form cũng được scan; đã sửa contrast/accessible label select. Reduced motion, API503/retry, direct reload và 404 đạt.
- Kiểm tra browser/DOM tự động đã chạy; chưa có đánh giá thủ công toàn diện với screen reader/người dùng hỗ trợ tiếp cận.

Thất bại đã chẩn đoán và sửa: React refresh do lệch major Vite (thống nhất Vite8); chuyển tiếp lỗi Origin trước CSRF; label select lẫn option text; contrast chữ phụ; selector test dùng sai nội dung thông báo so sánh. Các assertion nghiệp vụ/bảo mật được giữ. Nghiệm thu cuối không còn lỗi/test bỏ qua.

## T33

- `npm run setup`: npm ci cài 438 packages, giữ cấu hình .env/lockfile; migration, seed và bootstrap tái chạy an toàn.
- `services:stop` → `db:stop` → `services:start`: dừng đúng process/cluster riêng, dữ liệu giữ nguyên, HTTP/DB/ba demo render + reload đạt; start lần nữa đạt không nhân đôi dịch vụ.
- `npm run verify:build`: compiled API phục vụ React, SPA deep link200, API/asset thiếu404; login/logout và cookie Secure/HttpOnly/SameSite sau HTTPS proxy giả lập đạt. Chưa triển khai HTTPS production thật.
- `npm run check` cuối đạt lint, typecheck, build, 26 API/web, 10 E2E và compiled startup. Sau đổi reporter, E2E chạy lại đạt10/10; format check đạt.
- Bổ sung regression lead: hai request cùng key đồng thời201/200, không nhân đôi; retry sau archive/ngày hẹn đã qua trả ID cũ; yêu cầu mới vẫn bị validation/availability từ chối. `leads.test.ts`3/3 đạt; bộ API23/23.
- Secret scan114 source/log/artifact files đạt; .env bị Git bỏ qua và quyền600. Đã xóa HTML report vì step chứa password nhập, chuyển console reporter và trace off; E2E giữ nguyên assertion, không còn artifact lộ secret.
- README root/web/API, .env.example, scripts setup/DB/services/smoke/build và comment nghiệp vụ đã cập nhật.
- Cloud tool xác nhận status=saved, requires_publish=true cho install_script/start_skill; giữ nguyên cấu hình repository/network/credential của project cũ. Chỉ kiểm tra lệnh project-codex; không chạy legacy installer. Setup gốc của các repository khác được giữ nguyên trong cấu hình.
- Không còn blocker trong phạm vi project-codex. Review/lưu và publish trong cài đặt môi trường khi muốn lưu snapshot; bản nháp không tự áp dụng hay publish.

Publish/deploy và restore ở task mới chưa thực hiện; không thuộc nghiệm thu triển khai cục bộ.

## Yêu cầu đẩy GitHub (2026-10-06)

Người dùng đã cho phép commit, tạo repository mới project-codex và push. Kiểm tra source/tài liệu không chứa credential, database, node_modules hoặc build output; bằng chứng kiểm thử ở trên vẫn giữ nguyên. Account hiện tại là hoamiz; repo đích chưa tồn tại. GitHub từ chối tạo repository qua GraphQL và REST (403 Resource not accessible by integration). Toàn bộ source/tài liệu đã commit main cục bộ (root commit18b7730); origin trỏ tới https://github.com/hoamiz/project-codex.git. Cần repo trống và quyền truy cập để push; đây là blocker từ GitHub, không phải sandbox auto-review.

## GitHub hoàn tất (2026-10-06)

Repository https://github.com/hoamiz/project-codex đã được tạo bên ngoài, hiện public. API xác nhận quyền ghi và đã gửi đầy đủ 91 file. Git HTTPS trả lỗi401; dùng GitHub Git Data API với cơ chế xác thực sẵn có thay thế. Khởi tạo README thật rồi merge lịch sử; tree và commit được đối chiếu SHA với Git cục bộ, giữ các commit gốc18b7730/629a2c3. Cập nhật refs/heads/main không force, không ghi đè lịch sử người dùng. Sau khi hoàn tất, fetch và đối chiếu HEAD remote/local; .env và dữ liệu runtime vẫn được Git bỏ qua. Không có thay đổi logic ứng dụng hoặc deploy trong bước này.

## AutoHub UI theo Carmudi — 2026-10-07

Phạm vi: giao diện AutoHub tại `/projects/autohub`, trang chi tiết và so sánh; theme riêng, sidebar lọc desktop/panel mobile, lựa chọn hãng, bỏ từng điều kiện/xóa bộ lọc, thẻ xe, hướng dẫn và header/footer. Tham khảo HTML/CSS công khai của https://www.carmudi.vn/; giữ tên AutoHub, ảnh SVG nguyên bản và dữ liệu PostgreSQL/API hiện có. Không thay backend/schema/dependency.

File chính: `apps/web/src/main.tsx`, `features/autohub.tsx`, `features/autohub-layout.tsx`, `features/autohub.css`, `tests/e2e/autohub.spec.ts`, `tests/e2e/usability.spec.ts`.

| Kiểm tra đã chạy                                                                   | Kết quả                                                                                                                                                                             |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                                                     | Đạt, 0 warning                                                                                                                                                                      |
| `npm run typecheck -w @project-codex/web` và `npm run build -w @project-codex/web` | TypeScript và Vite build đạt; build chạy lại sau sửa hash                                                                                                                           |
| `npm run test -w @project-codex/web`                                               | 3/3 test, 2 file; 0 fail/skip                                                                                                                                                       |
| `npm run test:e2e`                                                                 | 12/12 đạt, 0 fail/skip; console log `.local/logs/autohub-e2e-final.log`                                                                                                             |
| `npm run verify:build`                                                             | Compiled API phục vụ React; ba demo render/reload, deep link, DB/HTTP, admin401, asset thiếu404 và cookie production qua proxy giả lập đạt; `.local/logs/autohub-build-runtime.log` |
| `npm run format:check`, `git diff --check`                                         | Đạt                                                                                                                                                                                 |

Hai E2E mới kiểm tra chọn hãng nhanh/đồng bộ URL, bỏ filter, reset giữ sort/pageSize, tìm bằng form, lọc trạng thái, cuộn mục từ trang chi tiết và reload, mở panel mobile bằng bàn phím, lọc hãng/năm, xóa lọc và lưu yêu thích. Mở rộng ba E2E responsive hiện có để quét cả trang chi tiết và so sánh xe: **360/768/1440px**, không tràn ngang, không có violation trong bộ WCAG2A/AA/2.1AA đã scan. Panel mobile khi mở cũng được axe quét. Các luồng lead→admin, CRUD/archive, session, yêu thích/so sánh và game vẫn đạt.

Lần đầu E2E đạt 11/12: liên kết hướng dẫn cuộn tới vị trí khi danh sách còn loading; khi xe xuất hiện, mục hướng dẫn bị đẩy xuống. Sửa effect để đợi dữ liệu xe và hãng trước khi cuộn, giữ assertion `toBeInViewport`; lần chạy cuối đạt 12/12. Đã xem screenshot desktop/mobile, danh sách, chi tiết, so sánh và hướng dẫn trong `.local/reference/` (artifact cục bộ bị Git bỏ qua). Scan tự động không thay cho nghiệm thu accessibility toàn diện bằng screen reader. Bộ API unit/integration không chạy lại trong thay đổi UI này; bằng chứng 23 API của T33 vẫn ở trên.

README/checklist đã cập nhật. Nghiệm thu UI hoàn tất cục bộ; việc commit/push được giao trong yêu cầu GitHub tiếp theo của người dùng.

## Room Studio 3D — 2026-10-07

Demo thứ tư trong cùng project-codex: editor `/projects/room-studio`, viewer `/projects/room-studio/view/:id`, sáu model hình học, màu/ánh sáng/camera, placement/grid/collision/history/draft, snapshot PostgreSQL public bất biến và copy. Phạm vi và task R01–R07 tại [kế hoạch Room Studio](room-studio-plan.md).

| Kiểm tra                                                   | Kết quả                                                                                                                                                           |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API migration/seed/typecheck và test rooms/public/database | 9/9 đạt; migration002 giữ migration001, whitelist4 URL; retry seed/migration và rollback giữ dữ liệu                                                              |
| Web room-core unit                                         | 5/5 đạt: grid/bounds/collision/rotation/limit, history có giới hạn/redo, draft hỏng/storage bị chặn, challenge                                                    |
| Room Studio E2E riêng                                      | 7/7 đạt; log `.local/logs/room-e2e.log`                                                                                                                           |
| `npm run setup` với lockfile mới                           | npm ci đạt; cấu hình `.env` giữ nguyên hash, dev vẫn4 project/12 xe/0 snapshot như trước; migration/seed/bootstrap tái chạy an toàn                               |
| Stop app rồi `services:start`                              | PostgreSQL/data giữ nguyên, API/web khởi động, JSON/DB/admin401 và4 demo render/reload đạt; `.local/logs/room-start-final.log`                                    |
| `npm run check`                                            | Lint0 warning, typecheck/build FE/API, **26 API + 8 web**, **19 E2E**, 0 fail/skip; compiled API/SPA/cookie/missing asset đạt; `.local/logs/room-check-final.log` |

Browser thao tác bằng chuột thật trên model giường: kéo từZ−1,25 đến0, snap đúng0,25m; vị trí ngoài phòng bị từ chối, draft giữ nguyên và undo một lần khôi phục cả lượt kéo. Bàn phím R/arrows/Delete/Ctrl+Z/Shift+Ctrl+Z, reset xác nhận, thêm món, màu/ngày đêm và reload giữ nháp đều đạt. Camera orbit làm ảnh xuất thay đổi; downloadPNG đúng signature và có nội dung, không sửa layout. Chromium dùng WebGL2 thật; không dùng ảnh giả để thay render3D.

Luồng chia sẻ cố ý trả503 sau khi server đã ghi, retry cùng key vẫn một row; mở URL/reload đọc đúng snapshot, giao diện không có công cụ sửa. Tạo bản sao rồi thêm đồ/reload giữ bản nháp đã chỉnh, GET snapshot cũ không thay đổi. Tên có markup hiển thị text. API validation bao gồm kind/color/version/grid/bounds/collision/ID trùng/max24, concurrentretry201/200, conflict409, Origin403, missing404 và PATCH không tồn tại.

Axe WCAG2A/AA/2.1AA tại360/768/1440px: editor, panel khi chọn đồ, help modal, viewer3D/2D không violation và không tràn ngang. Help đóng Escape/trả focus đúng. Storage hỏng hoặc bị chặn vẫn chỉnh trong phiên; catalog503/retry và snapshot404 có thông báo rõ. Test cố ý vô hiệu hóa WebGL xác nhận fallback2D vẫn chỉnh được; console error tạo context trong log thuộc trường hợp lỗi được kiểm thử này. Lần đầu axe phát hiện nested-interactive do Canvas mang role img, đã đổi thành group và chạy lại, không bỏ assertion. Chưa nghiệm thu toàn diện bằng screen reader hoặc thiết bị di động vật lý.

Manifest của Vite và request browser trên bản build xác nhận chunk studio không tải khi mở portfolio, chỉ tải khi vào Room Studio. Compiled SPA phục vụ URL trực tiếp và reload; API/asset thiếu404, admin401 và production cookie qua proxy giả lập tiếp tục đạt. Ba demo cũ/AutoHub UI không có regression trong bộ19 E2E.

File mới chính: `apps/api/db/migrations/002_room_studio.sql`, `services/room.ts`, `routes/rooms.ts`, `test/rooms.test.ts`; `apps/web/src/features/room-studio/`; `tests/e2e/room-studio.spec.ts`; SVG nguyên bản và docs. Comment tiếng Việt giải thích validation/collision/raycast/capture/history/draft/transaction/retry/copy. `.local/reference/` giữ screenshot desktop/mobile; artifact runtime/test bị Git bỏ qua. Thay đổi PJ4 chưa commit/push/deploy trong yêu cầu này.

Format check/git diff check đạt sau căn format route mới; không thay logic sau bộ check cuối. Secret scan108 source/tài liệu đạt. Cloud tool xác nhận start_skill `status=saved`, `requires_publish=true`; đọc lại xác nhận persistence và giữ nguyên install_script, repository membership, network, secret bindings/runtime requirements, legacy suffix. Hướng dẫn mới ghi bốn demo, startup, layout API, WebGL/2D, 26 API + 8 web + 19 E2E và trạng thái Git thực tế. Draft chưa tự áp dụng/publish; Review/Save rồi Publish trong cài đặt môi trường khi cần snapshot. Restore ở task mới chưa kiểm chứng. R01–R07 đã hoàn thành, không còn blocker.

## GitHub Room Studio 3D — 2026-10-07

Theo yêu cầu cập nhật riêng của người dùng, commit tính năng `14886e2c047eb4240e625b82dedb92a6a3f3be42` đã được đưa lên nhánh `main` của `https://github.com/hoamiz/project-codex`. 36 file thay đổi, tree đầy đủ108 file versioned; gồm editor3D, API/catalog/snapshot, migration002, dependency/lockfile, portfolio4 project, test và tài liệu. Format/staged diff check và scan secret đạt; `.env`, database, `.local`, node_modules, build và artifact test bị loại trừ.

Dùng GitHub Git Data API với xác thực sẵn có vì Git HTTPS thiếu xác thực ở lần cập nhật trước. Tree SHA `527547ba63ae` và commit SHA khớp Git cục bộ; cập nhật ref không force. Fetch và GET commit trên GitHub xác nhận `origin/main` và tree khớp HEAD. Không có thay đổi logic sau nghiệm thu26 API + 8 web + 19 E2E; cập nhật GitHub không triển khai website hoặc publish môi trường cloud.

## Sửa thiếu card Room Studio — 2026-10-07

Portfolio render card từ bảng `portfolio_projects`. Bản PJ4 trước chỉ thêm metadata bằng seed, trong khi server startup không chạy migration/seed. Tái hiện trên schema test riêng:001/002 đã áp dụng, metadata chỉ có3 project; khởi động server thật không seed rồi GET API vẫn thiếu room-studio. Test trước sửa thất bại tại danh sách slug. Database môi trường hiện tại có4 project; chưa có URL môi trường người dùng để xác nhận đây là nguyên nhân tại trang họ đang xem.

Bổ sung `003_room_portfolio.sql` đăng ký Room Studio bằng ON CONFLICT DO NOTHING; không sửa001/002 và không ghi đè metadata đã chỉnh. Server chạy migrate trước listen, thất bại nâng cấp thì dừng startup; runner giữ lock/checksum/transaction. Hai test mới `portfolio-upgrade.test.ts` khởi động process API thật trong schema fixture riêng, kiểm tra nâng cấp3→4, giữ metadata cũ/của Room Studio, migration ghi một lần và không trùng card. Fixture/schema/process riêng được dọn, không reset dev/test DB.

Kiểm tra mục tiêu đạt8/8 (upgrade/public/database). `npm run check` đạt **28 API + 8 web + 19 E2E**, lint0 warning/typecheck/build/compiled startup/SPA/cookie/asset404 đạt; log `.local/logs/room-card-check.log`. E2E Room Studio giờ bắt đầu từ card portfolio, click mở đúng URL và renderer hoạt động. Format/diff check đạt. Browser dev xác nhận4 card và điều hướng Room Studio, screenshot `.local/reference/room-card-fixed.png`. README/API/kiến trúc và checklist đã cập nhật.

Bản sửa `cea8b8d4a499bdb346a869ecee9b045dbab23e23` đã lên main của hoamiz/project-codex qua Git Data API, không force. Fetch/GET commit xác nhận tree/commit khớp cục bộ; scan110 file versioned không có local secret/artifact. Không triển khai website bên ngoài; bản chạy khác cần nhận code mới và khởi động lại API để tự áp dụng migration003.

## URL rooms được người dùng bổ sung — 2026-10-07

URL người dùng gửi sau kiểm tra C01–C03 là `/projects/rooms`, trước đó không được đăng ký và đi vào trang404; đây là vấn đề route riêng với trường hợp DB cũ đã tái hiện. Thêm alias chính xác bằng Navigate replace sang `/projects/room-studio`, giữ query/hash, không đổi URL metadata/card/API.

Lint0 warning, web typecheck/build, format/diff check đạt. E2E mới trực tiếp mở `/projects/rooms?from=projects#room-preview`, xác nhận editor/renderer, URL giữ query/hash, reload hoạt động và Back trở về portfolio đạt1/1; log `.local/logs/rooms-alias-e2e.log`. Compiled build smoke quét thêm alias, chuyển đúng path, bốn demo/render/reload, lazy chunk/HTTP/DB/admin401/asset404/cookie đạt; `.local/logs/rooms-alias-build.log`. Không chạy lại API/unit trong sửa route này; không gộp test mới thành số đếm của bộ C03 trước đó. README và API contract đã ghi URL tương thích.

## Brick Playground 3D — 2026-10-08

PJ5 trong cùng repository: editor `/projects/brick-playground`, viewer `/projects/brick-playground/view/:id` và card thứ năm từ PostgreSQL. Catalog10 loại/8 màu, đế32×32,150 gạch/cao48plate; chọn màu/click spawn, drag snap/stack, thả thùng rác, rotate/recolor/duplicate, settle/UndoRedo50, nháp, camera/PNG và snapshot/copy. Hợp đồng/task B01–B22 ở [kế hoạch](brick-playground-plan.md), bằng chứng mỗi task ở [checklist](../PORTFOLIO_TASKS.md). Không thêm dependency hay sửa lockfile; tái dùng Three/Fiber/Drei hiện có.

| Kiểm tra đã chạy                                | Kết quả thực                                                                                                                                                           |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Geometry/history/draft unit PJ5                 | 7/7:10 loại×4 rotation, half-open contact/bounds/collision/support, max height/count, spawnfull, settle tower/bridge/order, corrupt/unknown kind, history50/redo       |
| API validation + service + routes PJ5           | 8/8: strict/normalization, transaction/concurrent retry/rollback, roundtrip, read-only,400/403/404/409/413/429; DB thật                                                |
| Database/public/upgrade có PJ5                  | 10/10: migration/seed repeatability và rollback/constraints; bốn kịch bản startup từ3/4 project hoặc metadata Room/Brick đã chỉnh, không seed và không ghi đè          |
| PJ5 E2E                                         | 17/17 trong bộ cuối: WebGL/pointer/touch/keyboard,150 gạch, draft/storage, API retry/share/copy, contextlost/fallback và axe; không skip                               |
| `npm run check`                                 | Lint0 warning, typecheck/build FE/API, **38 API +15 web +37 E2E**,0 fail/skip; `.local/logs/brick-check-final.log`                                                     |
| `npm run build` + `npm run verify:build`        | Năm demo, viewer bất biến, direct/reload, alias Room, lazy manifest/network, HTTP/DB/admin401/SPA/API404/asset404 và cookie production qua proxy giả lập đạt           |
| `npm run setup`, owned stop/start rồi start lặp | Frozen npm ci/migrate/seed/bootstrap và readiness đạt; hash `.env` cùng row fingerprints bảy bảng giữ nguyên;5 project/12 xe/1 admin/0 lead/result/Room/Brick snapshot |
| Format + staged diff + scan                     | `npm run format:check`, check hai tài liệu PJ5 mới, `git diff --check`/staged diff đạt;131 file staged/versioned không chứa secret cục bộ hoặc artifact runtime        |

Browser dùng model thật: kéo lên mặt trên tạo đúng tầng, drag vượt đế/va chạm bị từ chối, Escape/pointercancel không đổi nháp. Thùng rác được kiểm tra bằng vùng DOM thật; kéo bỏ gạch nền hạ cả tháp, Undo khôi phục cả lượt, thả sát ngoài/cancel không xóa. Spawn dùng màu catalog đã chọn và không đổi màu gạch khác; đủ150 hoặc đế đầy báo rõ và không sửa layout. Rotation/recolor/duplicate/form tọa độ, clear cancel/confirm và history/redo sau lệnh mới đều đạt.

Camera/PNG kiểm tra ảnh thực thay đổi sau orbit, PNG có dữ liệu và không sửa layout. Lần đầu test phát hiện chuyển edit/orbit remount Canvas làm controls chưa sẵn sàng; sửa giữ Canvas/camera khi đổi mode và chạy lại assertion ảnh, không bỏ assertion. Scene có geometry/material cache + dispose, instancing nút đế và render theo nhu cầu. Screenshot desktop1440/mobile360 đã xem tại `.local/reference/brick-editor-1440.png`, `brick-editor-360.png`.

Storage JSON/version/geometry sai được bỏ an toàn; title tạm thời không hợp lệ không ghi nháp, reload giữ layout. Quota và get/set bị chặn vẫn chỉnh được và lưu snapshot PostgreSQL thật. Mất WebGL hoặc context chuyển sang2D và thử lại3D giữ công trình; fallback có keyboard/form/save, PNG disabled. Touch CDP thực kéo/xóa; panel mobile đóng/trả focus sau spawn. Axe WCAG2A/AA/2.1AA editor/panel/viewer3D/2D tại360/768/1440 không violation/tràn ngang. Lần đầu axe phát hiện aria-label trên div generic ở fallback; sửa role group và chạy lại, không giảm kiểm tra. Chưa nghiệm thu bằng screen reader toàn diện hoặc thiết bị di động vật lý.

Share cố ý mất phản hồi sau server201 rồi retry200: một row, đúng snapshot. Viewer direct/reload không có công cụ sửa và không ghi nháp; copy cancel giữ nháp, confirm tạo bản chỉnh và key mới, snapshot gốc bất biến. Catalog503/retry và snapshot404 có thông báo. API strict/geometry dùng chung module thuần, sort UUID/normalize trước hash và transaction advisory lock giữ concurrent retry một row. Body413 trả JSON an toàn; limiter chỉ giới hạn ghi, catalog và Room API vẫn dùng được. Không có fixture runtime/debug endpoint/public delete.

Migration004 tạo bảng `brick_designs`, mở whitelist thứ năm và đăng ký card ON CONFLICT DO NOTHING;001–003 giữ nguyên. Startup source/compiled áp dụng migration trước listen, giữ metadata đã chỉnh và không phụ thuộc seed. Smoke tạo snapshot bằng key riêng và xóa đúng fixture bằng query cục bộ; đối chiếu sau bộ cuối xác nhận dev không còn row smoke và dữ liệu/config không đổi. Bốn demo trước cùng alias `/projects/rooms` đạt trong37 E2E.

File chính: migration004, `services/brick-geometry.ts`, `services/bricks.ts`, `routes/bricks.ts`, ba test API; `apps/web/src/features/brick-playground/`, test core, SVG nguyên bản, router/card và `tests/e2e/brick-playground.spec.ts`; smoke năm demo/viewer và tài liệu. Comment tiếng Việt giải thích placement/support/settle, preview/capture/trash, history/draft/title recovery, transaction/key retry và copy. Artifact/secret/database vẫn bị Git bỏ qua. Build có cảnh báo kích thước shared3D chunk khoảng926KB; lazy manifest/network đã xác nhận chunk này không tải trên portfolio. Console lỗi tạo context thuộc test cố ý tắt WebGL; không có pageerror bất ngờ trong smoke. Cảnh báo Three.Clock từ thư viện hiện có không làm test thất bại.

Cloud `start_skill` đã lưu và đọc lại đúng: năm demo/PJ5, migration004, workflow/test evidence hiện tại. Install script/repositories/network/secret requirements/runtime requirements và legacy suffix giữ nguyên. Tool trả `status=saved`, `requires_publish=true`; đây là bản nháp, không áp dụng/publish môi trường hay deploy ứng dụng. Khi cần snapshot môi trường, review/lưu rồi publish trong settings; restore ở task mới chưa kiểm chứng. B01–B22 hoàn thành, không còn blocker triển khai. Người dùng đã giao đẩy PJ5 lên GitHub sau hoàn thành; báo cáo cuối xác nhận commit/remote sau khi push thành công.

## Code deploy và màn hình hồi phục — 2026-10-13

Người dùng giao triển khai theo D01–D14 và push, chọn **Vercel + Render Free + Neon Free**. Frontend static+Node Function gateway, RenderDocker API, Neon PostgreSQL17/SSL và màn hình readiness đã có code/config/test. D01–D07 hoàn tất phần chuẩn bị/kiểm tra cục bộ; D08 cần workflow chạy trên GitHub; D09–D14 chưa nghiệm thu public do quyền hosting thiếu. [Runbook](deployment-runbook.md) ghi từng thao tác và giới hạn free plans.

| Kiểm tra thực hiện                       | Kết quả                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime config + proxy boundary API      | 10/10: guard dev/test/prod, HOST/PORT/origin/secret/name/TLS, missing/wrong proxy token và sanitize IP/protocol; typecheck đạt                                                                                                                                                                                                                       |
| Readiness/controller/API client web      | 10/10: no background polling, sequential retry/deadline/abort/generation, late response, offline/visibility/dispose, no refetch loop, HTML/network và không replay mutation                                                                                                                                                                          |
| Gateway/routing deploy tests             | 5/5 với HTTP server thật: path/query/body/cookie/Set-Cookie/CSRF/key một lượt, fixed upstream, reject traversal/internal-path ambiguity/body limit/method/redirect/timeouts; Vercel API/SPA/asset404 routing                                                                                                                                         |
| Recovery E2E riêng                       | 8/8: deep link, HTML200,120s/Thử lại, native offline/online, login form và Brick draft/editor giữ nguyên sau failedsave; POST một lần; axe360/768/1440                                                                                                                                                                                               |
| `npm run check`                          | Lint0 warning/typecheck/build, **48 API +25 web +45 E2E**,0 fail/skip; compiled five-demo/lazy/SPA/APIasset404/cookie đạt; `.local/logs/deploy-check-final.log`                                                                                                                                                                                      |
| `npm run verify:container` sau firstBoot | Image non-root Node24 pinned digest, PG17 TLS đúngCA và rejectCA sai, compiled initialize2lần + firstBoot giữ metadata/hashadmin, API process không có ADMIN_PASSWORD, gateway403/HTTPS cookie,5 demo/direct/reload/alias/viewers, session/snapshot sau restart, dump/restore rows/counts/checksum đạt; `.local/logs/deploy-container-firstboot.log` |
| Format/schema/data preservation          | Format/diff đạt; Vercel published schema check_schema/config đầy đủ vớiDraft7 đạt (provider declaredDraft4 có mixed exclusiveMinimum); root lockfile/migration001–004 unchanged. Hash.env và rowfingerprints7 bảng dev giữ nguyên5 project/12xe/1admin/0lead/result/Room/Brick snapshot                                                              |

Màn hình chờ thực hiện trước mount app, nên React/HTML/CSS từ Vercel xuất hiện khi backend còn ngủ. Health kiểm tra DB thật và JSON200/no-cache, không chấp nhận trangHTML200 của hosting. Timeout8s/request, retry5s+jitter và tổng120s; quá hạn/offline có hướng xử lý, ready tự mở đúng path/query/hash. Sau lần vào app, banner giữ component/history/form/draft, hồi phục chỉ refetch active read queries; endpoint validation/401 vẫn theo nghiệp vụ. Không hard reload, replayPOST/PATCH/DELETE hoặc ping nền giữ service thức. Cooldown ngăn health/refetch lỗi endpoint gây vòng lặp.

Gateway Vercel lấy upstream/secret từ server env, chỉ chuyển path API hợp lệ/body<=32KB và headers cần thiết. Vercel IP header được xác minh/sanitized tại backend bằng shared-token boundary trước session/rate limiter; direct Render API thiếu key403. `/api/health` public cho hosting và no-store; nếu caller cung cấp token sai thì403. Browser không nhận proxy/session secret. Production không load.envdev, expectedDBName matchURL, remoteTLSverify-full và bounded pool/shutdown; localHTTP/testDB exception chỉ opt-in trong loopback compiled verification.

Docker frozen install sử dụng official Node24 digest đã pull, ownership manifest/compiled artifacts đúng usernode. Khi kiểm tra lần đầu gặp cacheDocker ở HOME read-only, chuyểnDOCKER_CONFIG vào.local. Container không có đường npm trực tiếp (probe ETIMEDOUT), sửa truyền proxy hiện có và CA public qua BuildKit secret mount trong npmci; không tắt TLS/certificate/integrity hoặc sửachecksum. Test non-root phát hiện manifest permission denied, sửaCOPY--chown. Test restart phát hiện Docker cấp lại ephemeralhostport, cập nhật proxy fixture theoport mới và giữ assertion session200. Sau sửa toàn bộcontainerchecks đạt; keys/envfixture cleanup, data chỉ thuộcDBcontainer riêng.

First boot được hỗ trợ qua `docker-entrypoint.sh` cho RenderFree: flagINITIALIZE_DEMO1 gọicompiled job, lỗi chặnAPI; unset admin keys rồi execserver. Init job ngoài runtime cũng có thể gọi tường minh. Operator xóaflag/admin keys khỏihosting sau lầnđầu; repeatedbootstrap khôngđổi account đã có. Docker verification đọcchỉpresence củaADMIN_PASSWORD trongAPIprocessenviron và xácnhậnfalse, khôngdumpvalues. Backupcustomarchive restore vàoDBmới,counts5/12/1Room/1Brick/4migrations và rowdigests6bảng khớp. Không thay backup/retentionproviderthật bằng kiểmtra này.

Screenshot đã xem: `.local/reference/service-wait-desktop.png`, `service-wait-mobile.png`; delayAPI làfixture minh họa, khôngclaimRenderidlethật. Axe waitingUI ở360/768/1440 khôngviolation hoặc trànngang, reducedmotion hỗtrợ. Console context errors trongbộcuối thuộc test cố ý tắtWebGL củaRoom/Brick; compiled/public-style smoke khôngpageerror bấtngờ. Shared3D chunkwarning vẫn có, manifest/network xácnhậnlazy; khôngtắt cảnhbáo đểpass.

Credential preflight: process và projectlocalconfig không cóVERCEL_TOKEN/RENDER_API_KEY/NEON_API_KEY; cloud draft trước đó khôngbindinghosting. Đã savedrequirements và đọc lại tên3key cùngRESENDlegacy. Allowed HTTPSdestinations tươngứngapi.vercel.com/api.render.com/console.neon.tech; khôngcóvalues trongGit/chat/log. GitHub actionssecretsmetadata403 nên khôngkếtluậnsecret củarepo vắng; workflowmetadataread được (trướcpush0workflow). Hướngdẫn cấpquaenvironmentSettings, khôngyêucầutokenchat. APIprovider thao tác/tài nguyên,URLstaging/prod,retention/livebackup/rollbackchưa chạy; cầnquyềnthật rồi tiếpD09–D14.

Cloud draft saving không áp dụng/publish environment hay deploywebsite. Install/network/legacyrepo settings giữngoài phạmvi source task; startup instructions cậpnhật workflow mới và evidence, giữlegacysuffix. Bằngchứng remotecommit/CI saupush được cậpnhật riêng khi có kếtquả. Chỉmark task theo bằngchứngthực, không dùng fullcheck118tests thay staging/public nghiệmthu.

Pre-commit cuối: scan158 file staged/versioned không có secret local/token/private key hoặc runtime artifact; `.env.production.example` chỉ là mẫu rỗng, credential/data/backup/key/log/ảnh screenshot ở.local không vàoGit. Format/diff/staged diff và documentlinks đạt. Cloud start_skill status=saved và re-read khớp; install_script/repositories/network_policy/secrets/runtime requirements giữ nguyên so với draft sau bổ sung3 credentialrequirements, legacysuffix byte-for-byte unchanged. Requires_publish=true chỉ là trạng thái draft; chưa publish môi trường/restore task mới/website public.

## GitHub và CI deploy — 2026-10-13

Commit tính năng `584e8b45894312f7337c8ba84493324ef1d30d05` đã push nativeGit lên `main` của hoamiz/project-codex, khôngforce.47 file thay đổi,158 fileversioned; fetchedref và GitHubAPIcommittree khớp localtree `3bb685dd572807e89f98ec11105ad14951448551`,workingtreeclean. Không upload.env/database/cache/dump/key/log/screenshotartifact.

Workflow mới [run38347799525](https://github.com/hoamiz/project-codex/actions/runs/38347799525) đã chạy thật trên GitHub và `conclusion=success` ở đúngfeatureSHA. Node24/PG17/Chromium,frozeninstall,lint/typecheck/build,48API+25web+45E2E,format,5deploytests vàDockerTLS/invalidCA/firstBoot/gateway/HTTPS/sessionrestart/restoređạt. Log được đọcqua quyền GitHubhiện có, chỉ lưu.local/logs/deploy-github-ci.log. D08 đã hoàn thànhworkflow/CI,promotion theoSHA đãcheck; repo protection settings khôngđổi.

D01–D08 đã cócode/config/testvàCI; D09–D14 cònblocked bởicredentialhostingchưa được cấp runtime. Đãsavedrequirements baAPIkeysecure trongsettings; khôngdùngGitHubtokenthayhosting vàkhôngsửdụngtokenchat. Chưacreate/publishstaging/prod/chưaURLwebsitepublic/chưanativeNeonretention/restore/rollback. Runbook/checklistcungcấpbước tiếp tục rõ; userauthorizationdeploy/push còn hiệu lực khiquyền được cấp. Commitnhật ký kếtiếp chỉthaydocs,sourceđãCI xanhởfeatureSHA vẫngiữnguyên.

## PJ6 — Bé vui học chữ (2026-10-13)

Route `/projects/vietnamese-alphabet`, card thứ sáu từ PostgreSQL.29 chữ đúng thứ tự, fontNunito tự host có Vietnamese/Latin vàOFL,29 SVG minh họa riêng,29 MP3giọng Hoài My vi-VN tốc độ-15%. Transcript/thời lượng/SHA256 trong manifest; tên chữ (bê/xê…), rồi từ ví dụ. Highlight bỏ dấu thanh nhưng giữ dấu chữ. Gợi ý nghe lại/bật tắt tiếng/ngẫu nhiên đã liệt kê trước triển khai, chưa đưa vào phạm vi chính. [Kế hoạch A01–A08](vietnamese-alphabet-plan.md) và [nhật ký](../PORTFOLIO_TASKS.md).

| Kiểm tra                 | Kết quả thực tế                                                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vitest PJ6 và toàn web   | 9/9 mới, toàn web34/34 đạt; timer3s từ ended, cancel/race, lỗi/timeout/retry,29 chữ/ví dụ/checksum/asset                                                                                         |
| API/database/upgrade     | 12/12 mục tiêu; toàn API50/50 đạt, DB fixture ba/bốn/năm project không seed và metadata Room/Brick/Alphabet đã chỉnh giữ nguyên                                                                  |
| Playwright PJ6           | 10/10 đạt59,4s;29 audio thật decode có mẫu âm, cùng origin, đọc native/timing/loadslow/retry/keyboard/focus/hidden/unmount/card/direct/reload                                                    |
| Responsive/accessibility | Axe board+popup360/768/1440 đạt, không overflow; popup giữa màn hình, reduced motion và vòng Tab; screenshots desktop/mobile/popup đã xem                                                        |
| Build/lint/type/format   | Các workspace đạt; format/diff check đạt. Bundle PJ6 khoảng10,8KBJS+10,5KBCSS, lazy; audio chỉ tải khi bấm thẻ                                                                                   |
| Routing/gateway          | Node deploy5/5 đạt; MP3/font thiếu trả404 trước SPA, audio hiện có phục vụ đúng MIME                                                                                                             |
| Docker/HTTPS/restore     | Exit0: non-root/pinnedNode24, TLS CA đúng-sai, compiled initialize2lần, gateway/cookie/sáu demo+voice, restart giữ session/snapshot vàrestore6card/12xe/1Room/1Brick/5migration cùng row digests |
| Full regression/compiled | npm run check exit0:50 API+34 web+55 E2E (4,4phút),0fail/skip, lint/type/build vàcompiled6demo/alias/lazy/direct/reload/SPA/APIasset404 đạt                                                      |

Logs riêng: `.local/logs/pj6-e2e-final.log`, `pj6-container-final.log`, `pj6-check-final.log`, `pj6-deploy-tests.log`, `pj6-format.log`, `pj6-services.log`. Lỗi initial importJSONNode24/pathassetjsdom, vòng Tab/dialogCSS phạm vi vàMIMEfixture được chẩn đoán/sửa, kiểm lại toàn assertion; không force click/bỏ test hoặc tắtTLS.

Migration005 thêm whitelist/card ON CONFLICT;001–004 vàlockfile giữ nguyên. Hash.env,5 card ban đầu và6 bảng dữ liệu khác đối chiếu trước/sau giữ nguyên, PJ6 là card mới duy nhất. Scan233 file tracked/new không chứa secret/artifact. Npm không thêm dependency; công cụ tạo media chỉ ở.local và không cần để build/chạy ứng dụng.

Giọng là audio tiếng Việt tổng hợp tĩnh, không phụ thuộc voice cài trên máy hoặc gọiTTS runtime; kiểm thử decoder/playback trên Chromium. Chưa đánh giá nghe chủ quan bởi người thật hoặc chạy trên thiết bịSafari/iOS/Android thật. D09–D14 hosting và URL public vẫn là bước riêng; các kiểm tra local/container không tạo release website.

Cloud start_skill đã saved/re-read đúng cho6 demo/PJ6, migration005 và workflow/test hiện tại; install_script/repositories/network/secret/runtime requirements cùng legacy suffix giữ nguyên. Draft requires_publish=true, chưa publish môi trường hoặc deploy public.

### Lời đọc PJ6 rút gọn (2026-10-14)

29 bản đọc được tạo lại thành tên chữ, khoảng nghỉ, rồi từ: `a. cái ca.`, không có “Chữ”/“Ví dụ”. Hoài My vi-VN vàtốc độ-15% giữ nguyên; manifest có transcript/checksum/duration mới vàrevision2, audioUrl thêm?v=2 để bỏ cache cũ. Nội dung ngắn hơn (1,968–3,552s); bound thời lượng test đổi từ2 xuống1s, vẫn kiểm đủ29MP3/SHA256/transcript/decoder vàmẫu âm hữu hiệu.

UnitPJ6 **9/9**, PlaywrightPJ6 **10/10** (57,1s), lint0 warning/webtype/build/format/diff đạt. Native ended vẫn đóng đúng3s, retry lỗi/tải chậm vàaxe360/768/1440 đạt. Logs `.local/logs/pj6-short-voice-unit.log`, `pj6-short-voice-e2e.log`, `pj6-short-voice-build.log`. Config/dữ liệu cũ giữ nguyên; không đổi API/database/container hoặc UI/controller, nên không chạy lại bộ hồi quy/Docker/API ngoài phạm vi audio.

### Âm học vần PJ6 (2026-10-14)

Theo yêu cầu mới,29 chữ dùng âm học vần (a, á, ớ, bờ, cờ, dờ, đờ…), không dùng tên chữ. c/k/q cùng âm cờ vài/y cùng âm i. Ví dụ `bờ. con bò.`, `cờ. con cá.`, `đờ. cái đèn.`; tiếp tục không đọc “Chữ” hoặc “Ví dụ”. Catalog sound/manifest readingMode=phonics/revision3 được cập nhật;19 MP3 mới và10 nguyên âm phù hợp giữ nguyên có transcript/duration/SHA256 đã kiểm. AudioURLv3 bỏ cache bản tên chữ.

UnitPJ6 **9/9** kiểm đầy đủ bảng âm vàlời đọcbờ-conbò; E2E **10/10** (59,4s) decode29audio thực, playbacknative thẻb vàđóng3s sauended, lỗi/retry/keyboard/hidden/axe360/768/1440 đạt. Lint0 warning/webtype/build/format/diff đạt; logs `.local/logs/pj6-phonics-unit.log`, `pj6-phonics-e2e.log`, `pj6-phonics-build.log`. Row fingerprints/config cũ giữ nguyên. Không thay BE/schema/container hoặcUI/controller; không dùng kết quả A08 toàn bộ để thay bằng chứng kiểm lại âm đọc này.

### Làm rõ h/k/q/s/x (2026-10-14)

Theo yêu cầu, h=hờ, k=ca, q=cu, s=sờ, x=xờ. Tạo lại5audio bằng cách đọc âm đầu riêng rồi từ minh họa, ghép thêm400ms nghỉ; âm đầu h/s/x-30%, k/q vàtừ-15%, âm đầu+10% volume. Không cắt đầu clip để tránh mất fricative h/s/x. Peak phần âm đầu-7,3 đến-3,9dB, không clipping.24audio khác giữ nguyên/checksum; manifest ghi thông số/revision4/overridekq, URL?v=4 làm mới cache.

Vitest **9/9**, Playwright **14/14** (1,5phút) đạt:5caseplaybacknative h/k/q/s/x và3s sauended, decode29clip, tải chậm/errorretry, keyboard/focus/hidden/unmount vàaxe360/768/1440. Lint0 warning/webtype/build/format/diff đạt. DBlocal ban đầu tắt gâyECONNREFUSED trước khi test chạy; khởi động bằngdb:start vàrerunexit0. Dữ liệu/config cũ đối chiếu giữ nguyên. Logs `.local/logs/pj6-clear-voice-unit.log`, `pj6-clear-voice-e2e.log`, `pj6-clear-voice-build.log`. Không thay BE/schema/UI/controller; kiểm tra máy không thay đánh giá nghe trực tiếp của người dùng.

## PJ7 — Bé vui học tập, nghiệm thu 2026-10-15

PJ7 là app học tập hai bài tại /projects/kids-learning, /matching và /tracing. Scan Studio/S01–S24 được lưu trữ; checklist hiện tại L01–L30 trong PORTFOLIO_TASKS.md. Card thứ bảy được thêm bằng migration006_kids_learning.sql, không thêm hồ sơ trẻ hoặc API nhận nét.

| Kiểm tra thực hiện                                        | Kết quả                                                                                                                                                       | Log cục bộ (được Git bỏ qua)                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| npm run check                                             | exit0; 51 API +78 web unit/component +99 E2E, 0 fail/skip; E2E7,9 phút, lint/type/build/compiled đạt                                                          | pj7-check-final.log                                          |
| Kiểm lại sau header44px, scroll lock và URL có slash cuối | Lint/type/build đạt; cả40 PJ7 E2E đạt trong3,4 phút; ca resize bổ sung1/1 đạt                                                                                 | pj7-build-final.log, pj7-e2e-final.log, pj7-resize-final.log |
| npm run format:check; npm run test:deploy                 | Đạt;5/5 routing/gateway tests, giữ kiểm HTML/API/media errors                                                                                                 | pj7-format-final.log, pj7-deploy-final.log                   |
| npm run verify:build sau thay đổi cuối                    | Đủ7 demo,3 URL PJ7/direct/reload, lazy, MP3MIME, API/asset404 và SPA/auth đạt                                                                                 | pj7-compiled-final.log                                       |
| npm run verify:container                                  | Non-root Node24, TLS CA đúng/sai, initialize2 lần/firstBoot, gatewayHTTPS/cookie,7demo+viewers, session/snapshot restart, dump/restore đạt 7 / 12 / 1 / 1 / 6 | pj7-container-final.log                                      |
| Owned services stop/start, services:start và smoke lặp    | PostgreSQL/FE/API lên lại, smoke đủ7 demo và assets, chỉ dọn UUID fixture của lượt kiểm                                                                       | pj7-startup-final.log                                        |
| Baseline, tài liệu và secret/artifact scan                | Sáu card cũ, dữ liệu app/cấu hình, migrations001–005/rootlockfile giữ nguyên; không secret hoặc artifact ngoài ý định                                         | Scripts .local/pj7/preserve.mjs, scan.mjs; nhật ký task      |

Bằng chứng tương tác: kiểm45 khoảng số, quy tắc ô sửa sau/draft/preset,10 nhóm đúng số hình, raw vòng thừa thành một Bézier, wrong/retry/khóa/cặp cắt nhau, cancel/outside và resize. Click đếm hình không tăng trùng hoặc tự nối. Bài đồ nét có24 tổ hợp4cặp×3mẫu×2mức, grader nhận run hợp lý và loại đường tắt/thiếu/ngược; native pointer vẽ thật, không gọi thẳng hàm hoàn thành hoặc sửa state để đạt. Bút bàn phím dùng cùng tọa độ/grader. Bốn hoạt cảnh trả về cùng đề, replay không thưởng lặp, hidden pause/resume, unmount/token cũ/reduced motion/watchdog/static fallback được kiểm.

Âm thanh:9MP3 Hoài My vi-VN tốc độ-15%, transcript/duration/SHA256/revision1; native AudioContext decode tất cả có mẫu âm hữu hiệu và duration>1s, Audio.play thật, không chồng tiếng, mute lưu trên máy, lỗi/retry không chặn chơi và đổi route dừng trong<1s trước khi clip tự kết thúc. Tutorial6s/hidden/Escape trả nguyên đề/nét/bộ đếm và focus, scroll lock được hoàn trả. Bộ12sticker cấp một lần/đề, reload/đủ bộ/dữ liệu hỏng/storage chặn hoặc hết quota vẫn xử lý đúng. Axe và target>=44px tại360/768/1440 bao gồm menu/10cặp/tracing/tutorial/collection đều đạt; ảnh UI đã xem trực quan trong.local/pj7.

Các lỗi đã chẩn đoán: SVG đo trước khi mount/letterbox được sửa bằng đo sau render và viewBox đúng; hai màu nhãn thiếu contrast được tăng tương phản. Testdatabase cũ kỳ vọng6card đã đổi đúng7, vẫn assert exact count. Một lần Vite reload khi chỉnh README trong lúc E2E làm mất đề; dừng chỉnh source khi chạy và case lặp3 lần đều đạt. Testaudio ban đầu đọc trước commit/cleanup đã đổi chờ menu và pause<1s; không nới đến lúc clip tự kết thúc. SmokeVite nhận HTML fallback200 cho Accept*/*; request media dùng audio/mpeg để nhận404, còn smoke production vẫn giữ kiểm404 mặc định. Không bỏ assertion, reset dữ liệu, tắt TLS/checksum hoặc dùng stub runtime.

Cloud start_skill đã lưu/đọc lại đúng7demo/PJ7/migration006; install_script, network, secret requirements và legacy suffix giữ nguyên. Không thay dependency hoặc lockfile, không gọi API trả phí. Chưa chạy GitHubActions cho thay đổi chưa push, chưa public deploy/publish snapshot hoặc thử khôi phục trên cloud task mới. Chưa thử Safari/iOS/Android/bút phần cứng thật và chưa nghe đánh giá chủ quan trên các thiết bị đó. Kết quả Chromium/CDP không thay bằng chứng thiết bị thật.

## PJ7 — Hoạt cảnh chậm và Bài 3/4 (2026-10-15)

Bài 2 có 11 cặp nhân vật–đích, gồm đủ ô tô gia đình–nhà, bạn nhỏ–trường học, chim–tổ và bé đạp xe–công viên. Nhân vật đi theo nét đã chấm đúng, làm mượt bằng đường bậc hai trong 7,2 giây, tăng/giảm tốc êm rồi hành động ở đích 2,4 giây. Giảm nhún, thêm bước chân/cánh bay/bánh xe phù hợp; bỏ tim nhấp nháy. Resize giữ timeline, cả di chuyển/động tác tạm dừng khi ẩn trang. Nét trả về cũng đổi hệ tọa độ theo độ rộng mới, vẫn giữ nét gốc để chấm.

Bài 3 tìm số có ba bản sao mỗi số, đen ban đầu, tìm tăng dần và đổi sang màu cố định khi đúng. Giữ form/preset/quy tắc start/end; chúc mừng 4,2 giây đủ nghe rồi chuyển số, gợi ý không tính hộ. Bài 4 gồm năm chủ đề, 24 hình và năm tranh nền SVG riêng; mỗi màn năm hình, vị trí theo địa hình và che một phần bằng lá/cỏ/đá. Chọn thẻ rồi tìm trong tranh, khóa hình đúng, gợi ý, Màn tiếp ngẫu nhiên tránh lặp chủ đề trước. Hướng dẫn mẫu, giọng Việt và sticker một lần/round dùng chung; không thêm API, DB hoặc dữ liệu trẻ.

| Kiểm tra thực hiện | Kết quả | Bằng chứng cục bộ (Git bỏ qua) |
| --- | --- | --- |
| Toàn web unit/component sau thay đổi cuối | 88/88, gồm 45 khoảng tìm số, thứ tự/nhấp lặp/callback cũ, năm chủ đề, vị trí/asset và pause/cleanup timer | .local/logs/pj7-discovery-unit-final.log |
| E2E hoạt cảnh trước khi thêm Bài 3/4 | 48/48 (7,7 phút), ma trận cặp cũ + bảy cặp mới, audio/keyboard/touch/axe | .local/logs/pj7-journeys-e2e-final.log |
| E2E Bài 3/4 sau chỉnh UI | 12/12 (52,5 giây), hoàn thành số/cảnh thật, range/preset, hint, hidden/tutorial/hủy timer, chọn thẻ/sai/khóa/màn random, touch/keyboard, axe/44 px ở 360/768/1440 | .local/logs/pj7-discovery-e2e-final.log |
| Hồi quy phần bị ảnh hưởng sau tích hợp | 8/8 (56,2 giây), card/routes/lazy, nét thực/resize và đường trả về, hidden/touch/unmount, bút bàn phím, audio/mute và axe ba kích thước | .local/logs/pj7-discovery-regression-final.log |
| Âm thanh | 52 MP3 native AudioContext decode có mẫu âm, playback thực; transcript/duration/SHA256/revision 3 đạt. 43 clip mới trong lượt này; chín MP3 ban đầu giữ nguyên, không TTS runtime | Unit/audio E2E và manifest.json |
| Lint/typecheck/format/build/deploy manifest | Đạt; cả hai workspace build, 5/5 routing/gateway tests | Lệnh nghiệm thu trong phiên |
| npm run verify:build sau nguồn cuối | Bảy demo, năm URL PJ7, direct/reload/lazy, media MIME/API/asset 404 và SPA/auth đạt | .local/logs/pj7-discovery-compiled-final.log |
| Xem UI và bảo toàn | Đã xem 11 hoạt cảnh, năm cảnh khám phá và số đen/đổi màu ở mobile; dữ liệu/cấu hình cũ, migrations và root lockfile giữ nguyên; secret/artifact scan đạt | .local/pj7/*.png, preserve.mjs, scan.mjs |

Lỗi đã sửa: phép đo native cho thấy nét sau resize còn tọa độ cũ (mép 862 thay vì 510); dùng cùng phép đổi tọa độ cho animation và nét trả về, E2E kiểm lại tọa độ thực đạt. Kiểm pause đợi Animation.ready để loại frame đang chờ, không nới assertion. Helper test số ban đầu dùng nth trên danh sách bị rút gọn sau mỗi lần tìm, được sửa sang danh sách ô ổn định; chọn chủ đề dùng role/name của combobox. Đã dừng batch lỗi và chạy lại đủ 12 test. Axe phát hiện nhãn chủ đề contrast 4,4:1, đã tối màu; xem ảnh phát hiện font button bị font:inherit ghi đè, đã sửa độ ưu tiên CSS và thêm kiểm font thực ≥40 px. Giữ đầy đủ assertion, không ép state hoàn thành hoặc bỏ case.

Không chạy lại toàn bộ API/container vì không thay API, SQL, dependency hoặc cấu hình container; compiled smoke đã kiểm bảy demo. Bộ 48 E2E được ghi ở thời điểm trước Bài 3/4, không thay bằng chứng cho 12 + 8 test sau tích hợp. Giới hạn vẫn là Chromium/CDP; chưa thử Safari/iOS/Android hoặc bút phần cứng thật, chưa đánh giá nghe chủ quan trên các thiết bị đó. Chưa commit/push/deploy các cập nhật này.
