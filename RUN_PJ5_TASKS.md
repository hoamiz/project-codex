# Prompt chạy toàn bộ PJ5 — Brick Playground 3D

PJ5 đã có editor/API/database và bộ kiểm tra thực. Trạng thái từng B01–B22 cùng bằng chứng hiện tại nằm ở mục PJ5 trong [PORTFOLIO_TASKS.md](PORTFOLIO_TASKS.md). File này là prompt thực hiện/tiếp tục; đọc checklist trước, không khởi tạo lại hoặc coi prompt là bằng chứng task đã chạy. Hợp đồng: [docs/brick-playground-plan.md](docs/brick-playground-plan.md); nghiệm thu: [docs/verification.md](docs/verification.md).

```text
Đọc /workspace/project-codex/RUN_PJ5_TASKS.md và triển khai toàn bộ PJ5 Brick Playground 3D theo B01–B22 đến nghiệm thu cuối.

Trước khi làm, đọc AGENTS.md, PORTFOLIO_TASKS.md, docs/brick-playground-plan.md, README.md và Git status. Chỉ sửa trong /workspace/project-codex, giữ thay đổi người dùng và bốn demo hiện có. T01–T33, R01–R07 và các bản sửa đã xong là lịch sử; không khởi tạo lại project hoặc reset database.

Phạm vi bắt buộc: catalog bên trái với 10 loại gạch/8 màu; chọn màu và click spawn; chân đế32×32 cố định; kéo snap/chồng gạch theo tọa độ nguyên và điểm tựa; kéo vào giỏ rác để xóa; xoay/đổi màu/nhân bản; settle rời rạc, Undo/Redo50; lưu nháp; camera/PNG; lưu snapshot PostgreSQL/chia sẻ/viewer chỉ đọc/copy; keyboard/mobile/fallback; card thứ năm. Tuân thủ chính xác hợp đồng của kế hoạch, không thêm gạch dốc/bánh xe/multiplayer hoặc engine vật lý trong MVP.

Tôi giao quyền tự chủ tạo/sửa file, dùng dependency hiện có hoặc cài phần cần thiết, cập nhật root lockfile, thêm migration/seed, chuẩn bị database riêng và chạy dịch vụ/kiểm tra cục bộ. Dùng React/TS/Tailwind/Three trong apps/web và Node/Express/TS/pg trong apps/api. DB dev là project_codex_dev, test là project_codex_test; không dùng cấu hình/dữ liệu repo khác. Không reset dữ liệu, sửa migration đã áp dụng hoặc đưa secret/artifact vào Git. Dừng/restart chỉ process do project quản lý. Commit/push và publish/deploy không phải bước tự động của prompt; chỉ làm nếu có yêu cầu riêng trong phiên.

Thực hiện lần lượt B01–B22 theo phụ thuộc. Kiểm tra code và bằng chứng trước task; tiếp tục từ task chưa đạt. Tự sửa lỗi, test lại phần bị ảnh hưởng; sau mỗi task ghi file/lệnh/kết quả/số test/fail/skip/hạn chế vào nhật ký PJ5 trong PORTFOLIO_TASKS.md, rồi mới đánh dấu [x]. Chỉ có một checklist triển khai ở đó, không đánh dấu hoàn thành chỉ vì có file hoặc test chạy zero case.

Thêm comment/JSDoc tiếng Việt cho chức năng không hiển nhiên: footprint/placement/point support/settle, raycast và vùng rác, command/history, draft recovery, validation, query/transaction và idempotent retry. Giải thích mục đích/quy tắc và lý do, không nhắc lại code hiển nhiên. Review và sửa comment khi hành vi đổi.

Mỗi task là điểm kiểm tra, không phải điểm kết thúc. Sau kiểm tra đạt tự chuyển task tiếp, không hỏi có tiếp tục không. Cập nhật tiến độ ngắn gọn; nếu có blocker DB/công cụ bên ngoài đã chứng minh thì ghi rõ, tiếp tục task độc lập đủ phụ thuộc. Chỉ cần người dùng can thiệp khi đã hết phần có thể tự xử lý an toàn; không coi im lặng là credential/quyền.

Kiểm tra phải chứng minh hành vi: pure unit cho geometry/history/draft, API integration PostgreSQL thật cho schema/validation/retry/concurrency/migration, Playwright pointer/keyboard/touch/WebGL thật cho editor/trash/share. Không dùng mock runtime thay API/DB; không bỏ assertion hoặc tắt kiểm tra bảo mật/checksum để làm xanh. Test fixtures cô lập, không reset DB dev; không chạy nhiều suite DB cùng lúc.

Nghiệm thu cuối: npm run check, npm run format:check, git diff --check và scan secret/artifact. Xác minh năm card từ database, card PJ5 mở editor; direct/reload/back, renderer lazy, 150 gạch, fallback và viewport360/768/1440; compiled startup tự migrate DB cũ không seed; giữ bốn demo/alias Room Studio. Setup/service lifecycle giữ dữ liệu/config. Cập nhật README/architecture/API contract/verification và checklist bằng kết quả thực, phân biệt fail/skip/chưa chạy; không tuyên bố xong nếu tiêu chí bắt buộc chưa đạt.

Bắt đầu triển khai và tiếp tục đến B22 hoặc blocker bên ngoài thật sự. Nếu ngữ cảnh rút gọn, đọc lại checklist/nhật ký rồi tiếp tục, không bắt đầu lại.
```
