# Prompt triển khai PJ7 — Bé vui học tập

**Prompt triển khai hoặc tiếp tục PJ7.** Kiểm trạng thái thực trong checklist; giữ phần đã đạt và tiếp tục task chưa có bằng chứng, không chạy lại bootstrap. Đọc [kế hoạch và tiêu chí](docs/kids-learning-plan.md) và checklist L01–L30 trong [PORTFOLIO_TASKS.md](PORTFOLIO_TASKS.md). Scan Studio và S01–S24 đã lưu trữ, không nằm trong lượt làm PJ7.

```text
Đọc /workspace/project-codex/RUN_PJ7_TASKS.md và triển khai PJ7 Bé vui học tập theo L01–L30 trong docs/kids-learning-plan.md đến nghiệm thu hoặc blocker bên ngoài đã chứng minh.

TRƯỚC KHI LÀM
Đọc AGENTS.md, README.md, PORTFOLIO_TASKS.md, kế hoạch PJ7 và Git status thực tế. Chỉ sửa project-codex, giữ thay đổi người dùng và sáu demo hiện có. Không tạo worktree, reset DB hoặc sửa migration 001–005. Các task lịch sử đã xong không chạy lại; S01–S24/Scan Studio lưu trữ, không tự triển khai hoặc gọi AI. Kiểm tra số migration tiếp theo thay vì dùng mù tên dự kiến 006.

BÀI 1 — NỐI SỐ
Ba cột: số | bảng trắng vẽ | nhóm hình. Tạo đủ mỗi số và nhóm hình trong khoảng start..end, gồm cả hai đầu; cột phải xáo trộn, số lượng hình chính xác. Giữ 1 <= start < end <= 10. Khi commit start sai, chỉ đặt start=end-1; khi commit end sai, chỉ đặt end=start+1. Áp dụng cả rỗng, ngoài 1..10 và thập phân; không sửa giữa lúc đang gõ 10 hoặc đọc state form cũ khi Bắt đầu.

Bắt đầu từ nguồn chưa khóa, kéo tới đích. Nét thô chỉ preview; khi thả đúng điểm nối thì bỏ toàn bộ raw/vòng thừa và thay bằng đúng một Bézier đầu tròn. Chấm theo giá trị, không theo nét đẹp. Đúng: xanh lá, tick, chúc mừng một lần, khóa hai đầu. Sai: đỏ, không khóa; bắt đầu vẽ lại nguồn đó thì xóa nét sai trước. Giữ nguyên cặp đúng, cho phép các nét cắt nhau. Pointercancel/thả ngoài/đích khóa không để nét rác. Chỉ nút tạo đề mới bỏ khóa/sinh đề.

BÀI 2 — ĐỒ NÉT
Mỗi lượt random một cặp cố định: ong-hoa, chó-xương, bò-cỏ hoặc bé-nhà; cùng một mẫu thẳng/zigzag/sóng. Không random lúc render, retry, resize hoặc animation kết thúc. Nét chấm chỉ dẫn start tới end. Chấm đường đi thật bằng đầu/cuối, hành lang, độ phủ, thứ tự và chiều dài; không chỉ so hai điểm, không thay nét bằng mẫu trước chấm. Nhận run tay hợp lý nhưng từ chối đường tắt/thiếu/nguệch ngoạc/nhiều nét rời.

Khi đạt, khóa nhập và tạm thay chính ô bài bằng hoạt cảnh tương ứng. Nhân vật đi theo đường rồi hút mật/gặm xương/ăn cỏ/vào nhà. Kết thúc về cùng cặp/cùng đường, trạng thái hoàn thành; Vẽ lại giữ đề, Bài tiếp mới random. Chỉ phát một lần, cleanup callback lượt cũ; hidden tạm dừng, unmount hủy, có reduced motion và watchdog có giới hạn.

SÁU CẬP NHẬT ĐÃ DUYỆT — BẮT BUỘC
1. Xem cách chơi bằng bàn tay trên state mẫu tách biệt; có bỏ qua/xem lại, kết thúc về nguyên đề/tiến độ, không cấp thưởng. Reduced motion dùng các khung tĩnh.
2. Dễ là mặc định khi vào/reload, có chọn Vừa. Điều chỉnh độ rộng nét/dung sai, vẫn bắt đồ đúng đường ở cả hai. Chốt profile khi tạo đề, không đổi khoảng start/end hoặc chấm lại nét hiện tại.
3. Chạm hình để đếm: mỗi hình tính một lần, có Đếm lại từng nhóm; không tự chọn đích/nối hoặc thay khóa. Phân biệt vùng đếm và điểm nối.
4. Giọng hướng dẫn tiếng Việt tự host, câu ngắn/rõ, có bật/tắt và nghe lại. Chỉ phát sau thao tác, một giọng, mute/đổi bài/hide/unmount dừng âm cũ; lỗi tải/phát không chặn chơi. Transcript/nguồn/license/duration/SHA/revision đầy đủ, không TTS runtime hoặc giọng Anh.
5. Preset 1–3 / 1–5 / 1–10 đặt cả hai ô nguyên tử, không tự bắt đầu; blur bản nháp cũ không ghi đè preset. Sau đó sửa từng ô vẫn theo quy tắc đã chốt.
6. Hoàn thành cả đề nối số hoặc đồ đạt mở một sticker mới trong bộ 12. Chỉ một lần mỗi roundId; Vẽ lại/tutorial/rerender/animation không cấp thêm. Bộ sưu tập lưu localStorage version/dedupe, lỗi/chặn/đầy vẫn dùng trong phiên. Không tính tốc độ, xếp hạng hoặc trừ điểm.

KIẾN TRÚC VÀ GIAO DIỆN
Dùng React/TypeScript/Tailwind, SVG/Pointer Events và CSS/SVG hoặc Web Animations API. Logic thuần tách React, RNG inject trong test. Không cần Three.js, AI, API trả phí hoặc thư viện canvas nặng. UI sáng/vui/đơn giản, font Nunito tiếng Việt tự host, SVG đếm được rõ. Touch/mouse/pen, target >=44px, keyboard, aria-live, reduced motion, 360/768/1440 px; không khóa cuộn/zoom toàn trang.

Node/PostgreSQL thêm card thứ bảy bằng migration/seed an toàn; không thêm hồ sơ trẻ hoặc API lưu nét cho MVP. Tái dùng ServiceReadiness và cập nhật đủ tên demo; mất mạng khi đã vào bài giữ nguyên state. Lượt hiện tại ở bộ nhớ; chỉ lưu bộ sticker và lựa chọn âm thanh trên thiết bị. Reload chưa phục hồi đề/nét và vẫn mặc định Dễ. Scan Studio không chiếm card/migration hiện tại.

QUYỀN VÀ CÁCH LÀM
Khi được giao triển khai, tự sửa file, cài dependency cần thiết với một root lockfile, tạo migration mới, chuẩn bị DB dev/test riêng, chạy dịch vụ và tests. Không mở rộng sang repo khác hoặc xóa dữ liệu. Commit/push/deploy theo yêu cầu áp dụng trong phiên, không tự mua dịch vụ.

Làm lần lượt theo phụ thuộc L01–L30; test mỗi task, chẩn đoán/sửa lỗi và kiểm lại phần bị ảnh hưởng. Ghi file/lệnh/pass/fail/skip/hạn chế trước khi đánh dấu [x]. Tự chuyển task tiếp theo, không hỏi có tiếp tục không hoặc dừng sau một task. Chỉ cần người dùng can thiệp khi có blocker thực sự và đã làm hết phần độc lập.

COMMENT VÀ TEST
Comment/JSDoc tiếng Việt cho quy tắc range theo ô sửa sau, RNG, tọa độ/pointer capture, chuẩn hóa Bézier, khóa/retry, resampling/chấm đồ nét, animation/token/cleanup, profile, đếm một lần, audio lifecycle, preset nguyên tử, sticker/storage và migration cần giải thích. Nêu mục đích, giả định và quyết định; không diễn lại code hiển nhiên.

Kiểm 45 khoảng hợp lệ và bảng range lỗi, bốn cặp x ba mẫu x hai mức. Kiểm ba preset, tutorial giữ state, đếm không lặp, native audio/mute/lỗi phát, sticker một lần và storage hỏng/chặn/đầy. Test logic pure/component, DB upgrade fixture, browser native pointer/touch/keyboard, axe, ảnh UI và từng hoạt cảnh. Không gọi hàm hoàn thành hoặc sửa state để E2E đạt; không bỏ assertion, reset dữ liệu hoặc tắt TLS/checksum. Dùng fixture/schema riêng, tránh suite chung DB chạy đồng thời. Ghi rõ thiết bị thật chưa thử; không coi axe là bằng chứng hình đếm/hoạt cảnh đúng.

NGHIỆM THU
Chạy npm run check, npm run format:check, npm run test:deploy và container checks bị ảnh hưởng; verify compiled/direct/reload/lazy/card7/readiness/DB6->7, sáu demo cũ và bảo toàn data/config. Xem trực quan 10 cặp, nét đúng/sai, ba mẫu, bốn cảnh, tutorial, Dễ mặc định và bộ sticker. Rà license/comment/audio/secret/artifact. Cập nhật README/architecture/verification/checklist và startup instructions nếu cần. Chỉ kết luận hoàn thành khi có bằng chứng mọi tiêu chí bắt buộc; nêu rõ đã chạy/chưa chạy và hạn chế.
```
