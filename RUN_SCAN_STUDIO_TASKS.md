# Prompt lưu trữ — Scan Studio 3D

**Lưu trữ từ 2026-10-15:** PJ7 hiện là Bé vui học tập. Prompt này chỉ được dùng khi người dùng yêu cầu triển khai Scan Studio riêng; các số card/migration trong nội dung là dự kiến lịch sử, phải kiểm tra lại trước khi làm.

**Hiện mới có kế hoạch.** Chỉ chạy khi người dùng giao triển khai Scan Studio riêng. Hợp đồng và task: [docs/scan-studio-plan.md](docs/scan-studio-plan.md). Checklist lưu trữ S01–S24: [PORTFOLIO_TASKS.md](PORTFOLIO_TASKS.md).

```text
Đọc /workspace/project-codex/RUN_SCAN_STUDIO_TASKS.md và triển khai Scan Studio 3D theo S01–S24 trong docs/scan-studio-plan.md, đến nghiệm thu hoặc blocker bên ngoài đã chứng minh.

TRƯỚC KHI LÀM
Đọc AGENTS.md, README.md, PORTFOLIO_TASKS.md, kế hoạch Scan Studio và Git status. Chỉ làm trong project-codex, giữ thay đổi người dùng và các demo hiện có. Không tự tạo worktree, reset DB hoặc sửa migration đã áp dụng. Kiểm lại số card/migration dựa trên trạng thái thật trước triển khai. Các task đã hoàn thành là lịch sử; không chạy lại bootstrap. Đọc nhật ký thực tế để tiếp tục đúng khi bị gián đoạn.

PHẠM VI
Một ảnh, chỉ vật thể chính: chọn ảnh → crop/mask/tách nền → preview PNG → xác nhận → job AI → model GLB có texture → viewer xoay/zoom/reset/wireframe → tải GLB/lịch sử/chia sẻ opt-in. Ảnh gốc chỉ giữ trong trình duyệt; chỉ prepared PNG được upload và gửi provider. Thêm route scan-studio, job riêng, public share token và card thứ bảy. Tách nền tự động, nhiều ảnh, AR và nhập Room Studio là mở rộng, không tự thêm. Model từ một ảnh suy đoán phần khuất; không quảng cáo độ chính xác đo đạc.

KIẾN TRÚC
Dùng React/TS/Tailwind và Three/Fiber hiện có, Node/Express điều phối, PostgreSQL lưu jobs/quota và object storage private. Không chạy inference GPU trên Render Free hoặc lưu GLB lâu dài trên filesystem tạm/DB binary. Giữ body JSON gateway/API 32 KB; ảnh/GLB truyền trực tiếp storage bằng URL có chữ ký. AI thật cần provider/account/quota/storage đã xác minh; ngân sách mặc định 0. Tái dùng auth admin cho người tạo, khách xem model mẫu có nhãn rõ; không coi mẫu là kết quả ảnh khách.

QUYỀN VÀ CẤU HÌNH
Khi được giao triển khai, tự sửa file/dependency/root lockfile, thêm migration mới, chuẩn bị DB dev/test và fixtures riêng, chạy dịch vụ và tests. Không tự mua credit, thêm thẻ, nâng gói hoặc bật inference trả phí. Commit/push/deploy khi có yêu cầu áp dụng trong phiên. Credential qua Settings phù hợp, không xin hoặc ghi secret trong chat/log/VITE. Kiểm binding và thao tác đọc trước khi kết luận thiếu quyền. Các task hosting D09–D14 là workflow riêng.

THỰC HIỆN VÀ TEST
Chạy theo phụ thuộc; sau mỗi task, test phù hợp, chẩn đoán/sửa lỗi, kiểm lại phần bị ảnh hưởng rồi ghi file/lệnh/kết quả/pass/fail/skip/hạn chế trước khi đánh dấu [x]. Tự chuyển task tiếp theo, không hỏi có tiếp tục không hoặc dừng tại một mốc. Thiếu quyền/ngân sách ở S02 thì ghi bằng chứng và làm hết phần độc lập qua contracts/fixtures/FE. Giữ S22/S24 chưa hoàn thành khi chưa kiểm nghiệm AI thật; không dùng demo/stub để đánh dấu đạt. Chỉ cần người dùng can thiệp khi đã hết phần độc lập và có blocker thực sự.

COMMENT
Thêm comment/JSDoc tiếng Việt cho hàm có logic cần giải thích: mask/tọa độ/alpha, validation binary/hash, signed upload/ownership/ngân sách, lease/state/idempotency/unknown submission, import/disposal GLB và poll/khôi phục. Giải thích mục đích/quy tắc và giả định; không nhắc lại code hiển nhiên. Cập nhật comment khi đổi hành vi.

KIỂM CHỨNG
Dùng unit có ý nghĩa, PostgreSQL/storage integration thật, provider HTTP fixture trong test và browser WebGL/pointer/touch/keyboard/axe. Runtime không giả inference; model mẫu/relief không chứng minh model tạo từ ảnh. Không tự gửi lại POST provider khi chưa biết đã nhận/tính credit; lưu unknown và đối chiếu. Không tắt TLS/checksum/assertions hoặc reset data để test đạt. Fixtures dùng schema/prefix/process riêng; CI mặc định không gọi AI tốn credit.

NGHIỆM THU
S22 phải có ba prepared PNG và ba GLB mới từ engine thật, bằng chứng nguồn/hash/task/time/cost/chất lượng; kiểm xoay, tải, mở lại và chọn một vật thể từ ảnh nhiều vật thể. Chạy npm run check, format:check, test:deploy và container checks phù hợp; kiểm secret/artifact, bảy card/routes/lazy và sáu demo cũ, worker restart/nâng cấp DB/bảo toàn dữ liệu. Cập nhật README/architecture/API/verification/checklist và startup instructions khi cần. Báo rõ đã chạy/chưa chạy, mẫu/live và blocker; không kết luận hoàn thành nếu S22 chưa đạt. Git/publish tuân theo quyền đã được giao trong phiên.
```
