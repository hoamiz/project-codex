# Prompt thực hiện deploy project-codex

Ngày2026-10-09: D01–D14 đang là kế hoạch, chưa triển khai. Hợp đồng/phương án ở [docs/deployment-plan.md](docs/deployment-plan.md); checklist duy nhất ở mục Deploy trong [PORTFOLIO_TASKS.md](PORTFOLIO_TASKS.md).

Người dùng hiện chỉ xem kế hoạch, chưa chọn nhà cung cấp. Chỉ dùng prompt bên dưới khi có yêu cầu triển khai mới; không coi lựa chọn xem kế hoạch là giao chạy D01–D14.

Đây là prompt để dùng khi người dùng giao triển khai; bản thân file không cấp quyền tạo tài nguyên trả phí, deploy hoặc đổi DNS.

```text
Đọc /workspace/project-codex/AGENTS.md, PORTFOLIO_TASKS.md và docs/deployment-plan.md.
Thực hiện D01–D14 để đưa project-codex lên website public theo hosting/ngân sách/domain đã chốt với tôi.

Tôi giao quyền tự chủ sửa code/config/container/CI, test, chẩn đoán và khắc phục trong project-codex. Tiếp tục theo phụ thuộc đến nghiệm thu; không hỏi có tiếp tục không sau mỗi task. Giữ toàn bộ tính năng và dữ liệu của năm demo, không khởi tạo lại project, không sửa migration đã áp dụng. Thêm JSDoc tiếng Việt cho logic production/proxy/config/DB/release không hiển nhiên.

Trước khi tạo dịch vụ trả phí hoặc đổi DNS, xác nhận thông tin hosting/budget/domain và quyền tương ứng đã có trong phiên. Nếu chưa có, tiếp tục các bước code/test độc lập, ghi blocker đúng task và yêu cầu thông tin/quyền thật sự còn thiếu. Không coi quyền GitHub là quyền hosting, không hỏi secret trong chat. Kiểm tra binding/CLI sẵn có trước khi yêu cầu kết nối tài khoản; dùng secret manager cho DATABASE_URL/SESSION_SECRET/admin bootstrap.

Đích là một Node service phục vụ React build và /api cùng origin, một PostgreSQL production riêng và staging/DB riêng để thử trước. Nhà cung cấp chưa được chọn; Railway chỉ là phương án tham khảo. D01 phải chốt nhà cung cấp trước các task phụ thuộc và không tự chọn thay người dùng. Giữ cookie HTTPS/CSRF/Origin, test guard project_codex_test, migration checksum/lock/transaction và SPA/API/asset404. Không dùng .env hay database dev làm production.

Nếu chọn hosting có backend tự ngủ và yêu cầu màn hình chờ, chốt nhánh frontend tĩnh/CDN độc lập ở D01. Proxy /api qua origin frontend để giữ auth; không coi loading component do Node đang ngủ phục vụ là giải pháp. Xây màn hình chờ/poll health có timeout/no-cache, chỉ sẵn sàng với200 JSON data.status=ok; tự chuyển state/refetch đọc khi ready, giữ pathname/query/hash/draft/form. Có timeout tổng/retry/offline/cleanup, không reload lặp hoặc tự replay mutations. Hợp đồng và test nằm ở mục nhánh màn hình chờ của deployment-plan, tích hợp D03/D06/D07/D10/D12.

Sau mỗi task chạy kiểm tra có thể phát hiện lỗi, sửa rồi kiểm tra lại, ghi file/lệnh/kết quả/fail/skip/bằng chứng vào nhật ký Deploy trong PORTFOLIO_TASKS.md rồi mới đánh dấu. Không dùng baseline90 test ngày2026-10-08 làm bằng chứng deploy. Không đánh dấu public task khi chỉ chạy localhost hoặc test zero case. CI và đầy đủ mutation tests dùng DB test/staging; production smoke mặc định chỉ đọc.

Hoàn thiện production config/listener/proxy/DB, compiled seed/admin, Docker image, smoke deploy và CI trước. Deploy staging commit đã kiểm tra; thử năm demo qua HTTPS, auth và snapshot sau restart. Cấu hình backup, restore vào DB riêng và diễn tập rollback app trước production. Chốt origin/HTTPS rồi đưa cùng commit/image đã nghiệm thu lên production trong scope tôi giao; nếu thiếu quyền/billing thì hoàn thành phần độc lập và báo blocker.

Không tự force-push, reset/drop DB live, down migration hoặc overwrite snapshot/lead/admin. Commit/push code dùng quyền tôi đã giao trong phiên; nếu chưa có thì chuẩn bị diff/test/tài liệu để review. Nguồn code GitHub phải chứa đúng code chuẩn bị deploy, không chứa secret/database/artifact. Không publish môi trường Codex thay cho website production.

Kết thúc khi D01–D14 đạt hoặc có blocker ngoài thật sự: báo URL HTTPS, branch/commit/image, năm demo hoạt động, kết quả CI/staging/production thực, backup/restore/rollback và hạn chế còn lại. Nếu ngữ cảnh rút gọn, đọc checklist/nhật ký rồi tiếp tục đúng task đang dở.
```
