# Nhật ký nghiệm thu

2026-10-06, `/workspace/project-codex`; Node 24.19.0/npm 11.9.0, PostgreSQL17, Chromium. Fixture chỉ thuộc `project_codex_test`; dev giữ dữ liệu. Không sử dụng app/database của repository khác.

## T01–T30

[Checklist](../PORTFOLIO_TASKS.md) ghi kết quả sau mỗi task. Bảng bổ sung file và ánh xạ kiểm tra thực tế; bộ cuối xác minh lại sau khi nối toàn ứng dụng.

| Task | File chính | Kiểm tra đã chạy |
| --- | --- | --- |
| T01 | docs architecture/API | Runtime, DB riêng current_database(),1 |
| T02 | web package, Vite/TS, main.tsx | FE typecheck/build, router/dev browser |
| T03 | API config/server/app | Typecheck/build, health, compiled startup |
| T04–T05 | migrations.ts, 001_initial.sql | database.test: idempotent/rollback/constraint/FK |
| T06 | seed.ts, public/images | Seed hai lần: 3 project/12 xe, giữ chỉnh sửa |
| T07 | components/ui.tsx/styles | ui.test: focus/Escape/pagination |
| T08–T09 | public routes/portfolio.tsx | public.test; browser card/navigation; E2E 3 card |
| T10–T11 | public routes/autohub.tsx | API filter/sort/page/empty/archived; browser query; E2E filter/reload |
| T12–T13 | detail/by-ids/gallery | API detail/404/giá number; browser gallery/URL |
| T14–T15 | leads route/lead-form.tsx | leads.test: validation/idempotency; E2E form/DB |
| T16 | storage/compare UI | Browser limit3/favorite; E2E persistence/compare/reload |
| T17–T18 | auth/password/bootstrap/UI | admin.test/password.test; E2E login/reload/logout/expire |
| T19–T21 | admin cars route/UI | API CRUD/409/archive giữ lead; E2E form/giá/public/archive |
| T22–T23 | admin leads route/UI | API filter/status/conflict/contact giữ nguyên; E2E detail/update/DB |
| T24–T25 | stats route/dashboard | API UTC+7/7 bucket/zero; browser dashboard/axe |
| T26 | services/game.ts | game.test: 3 độ khó/match/mismatch/lượt/server clock |
| T27–T28 | game routes/UI | API token/expire/concurrent409/hidden faces; E2E keyboard/reload/cooldown/finish |
| T29–T30 | results/leaderboard/UI | API finish/unique/idempotent/ranking; E2E nickname escape/lưu/reload |

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
