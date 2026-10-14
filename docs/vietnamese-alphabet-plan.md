# PJ6 — Bé vui học chữ

Route `/projects/vietnamese-alphabet`, card thứ sáu trong portfolio. Phạm vi: đủ29 chữ tiếng Việt theo đúng thứ tự, chữ hoa/thường dễ đọc, minh họa riêng cho từng ví dụ, popup trung tâm và giọng tiếng Việt. Các gợi ý đã liệt kê trước khi triển khai (nghe lại, bật/tắt tiếng, khám phá ngẫu nhiên) là tùy chọn cho phiên bản tiếp theo.

## Task và nghiệm thu

| Task | Phụ thuộc | Tiêu chí và kiểm tra                                                                                                                                                  |
| ---- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01  | Không     | Chốt29 chữ/ví dụ, từ chứa đúng chữ kể cả dấu; kiểm tra dữ liệu/asset bằng unit test.                                                                                  |
| A02  | A01       | Minh họa SVG tương ứng, font Nunito có tiếng Việt tự host, âm thanh tiếng Việt có transcript/nguồn/checksum; kiểm tra tất cả file decode được, không cần TTS runtime. |
| A03  | A01,A02   | Controller phát audio ngay trong click, chỉ tính3 giây từ `ended`; test tải chậm, lỗi/retry, cancel và sự kiện cũ.                                                    |
| A04  | A03       | UI tươi sáng, grid29 card, dialog giữa màn hình, đóng/Escape/backdrop, focus và reduced motion; không tự đóng khi lỗi âm thanh.                                       |
| A05  | A04       | Migration005/seed đăng ký card, route lazy và portfolio6 card. Nâng cấp DB5 project không seed, giữ metadata và whitelist; migration001–004 bất biến.                 |
| A06  | A04,A05   | E2E audio thật, popup không đóng sớm và đóng3 giây sau `ended`, retry, keyboard/focus, hidden/unmount cleanup, direct/reload và axe/mobile.                           |
| A07  | A05,A06   | Lint/type/build/unit/API/E2E và smoke compiled/deploy hiện có; cập nhật số lượng6 project.                                                                            |
| A08  | A07       | README/architecture/verification/checklist và nhật ký kết quả thực; bảo toàn dữ liệu cũ, không publish/push khi chưa được giao ở lượt này.                            |

## Nội dung và âm thanh

Âm học vần được đọc bằng tiếng Việt (ví dụ a, á, ớ, bờ, cờ, dờ, đờ…), sau đó đọc rõ từ ví dụ. Các âm thanh tĩnh tự host dùng cùng giọng Việt, tốc độ chậm vừa phải. Không dùng giọng tiếng Anh nếu trình duyệt thiếu tiếng Việt. Ví dụ a–cái ca, ă–cặp sách, â–con gấu, b–con bò. Tô nổi bật chữ trong ví dụ sau khi bỏ dấu thanh, giữ dấu chữ (ă, â, ê, ô, ơ, ư).

`play()` được gọi trực tiếp từ hành động của người dùng để hỗ trợ chính sách autoplay trên mobile. Hủy audio và timer khi đóng, đổi thẻ, rời trang hoặc ẩn tab. Tải chậm/thất bại giữ thẻ và cho thử lại; không giả lập đọc xong. Chỉ `ended` hợp lệ của audio hiện tại mới bắt đầu3 giây. Không yêu cầu micro, tài khoản, lưu dữ liệu trẻ hoặc dịch vụ TTS bên ngoài khi sử dụng.

Nguồn dữ liệu: `features/vietnamese-alphabet/alphabet.json`; ảnh/audio/font trong `public/`. Bằng chứng test và giới hạn được ghi trong `docs/verification.md` sau khi chạy.

Cập nhật lời đọc (2026-10-14): mỗi clip chỉ đọc âm học vần, nghỉ ngắn, rồi từ; không đọc “Chữ” hoặc “Ví dụ”. Ví dụ `a. cái ca.` tương ứng “a — cái ca”. Giữ giọng Hoài My/tốc độ-15% và thời gian đóng3s sau ended. URL audio revision4 làm mới cache khi thay lời đọc.

Điều chỉnh âm đọc theo yêu cầu (2026-10-14): 29 chữ dùng bảng sound đã chốt; k đọc ca, q đọc cu theo yêu cầu mới, i/y cùng âm i. Không thêm “Chữ”/“Ví dụ” vào audio.

Cải thiện h/k/q/s/x (2026-10-14): hờ, ca, cu, sờ, xờ. Tách âm đầu và từ minh họa để giữ cách phát âm độc lập; h/s/x dùng-30% vàâm đầu+10% volume, nghỉ thêm400ms trước từ. Năm clip mới,24 clip giữ nguyên; ghi thông số vàchecksum trong manifestrevision4.
