# PJ7 — Mở rộng bốn bài học

Yêu cầu ngày 2026-10-15 bổ sung vào [PJ7](kids-learning-plan.md), giữ nguyên hai bài đã có và dữ liệu cũ. Không thêm backend hoặc hồ sơ trẻ. Chỉ bộ sticker và lựa chọn âm thanh lưu trên thiết bị.

## Bài 3 — Tìm số sắc màu

Route `/projects/kids-learning/number-search`. Dùng lại form start/end 1–10 và preset 1–3/1–5/1–10, cùng quy tắc ô sửa sau của Bài 1. Mặc định 1–5. Mỗi số có ba bản sao, xáo vị trí và lệch nhẹ trong các vùng chạm tách nhau; tất cả bắt đầu màu đen. Tìm lần lượt từ start đến end. Chỉ chạm số đang được yêu cầu mới tính, chạm lại không tăng tiến độ. Số tìm đúng chuyển sang màu cố định theo giá trị: 1 xanh dương, 2 xanh lá, 3 cam, các số còn lại có màu riêng.

Tìm đủ ba bản sao thì chúc mừng ngắn và tự sáng số tiếp theo trong câu hỏi sau 4,2 giây (đủ nghe lời chúc mừng); không tự tô các số chưa tìm. Tìm hết cả khoảng thì chúc mừng và nhận một sticker theo roundId. Gợi ý chỉ khoanh một số đang cần tìm trong 2,4 giây, không tính hộ. Timer ngừng khi ẩn trang, mở hướng dẫn/collection; rời bài hoặc tạo bảng mới hủy callback cũ. Có hướng dẫn riêng, giọng Việt cho từng số và Chơi lại tạo bảng mới.

## Bài 4 — Trốn tìm kỳ thú

Route `/projects/kids-learning/hide-and-seek`. Năm chủ đề: đại dương, sa mạc, rừng rậm, khủng long, phương tiện giao thông. Mỗi cảnh có năm hình phù hợp chủ đề, một tranh nền nguyên bản và các hình nấp một phần sau chi tiết cảnh; không che vùng chạm hoặc giấu kín hoàn toàn. Vị trí được xáo trong các vùng tách nhau, không random lại khi render/resize/hint.

Chọn thẻ trong bảng để biết hình cần tìm; mặc định thẻ đầu. Chạm đúng hình đang chọn trong tranh thì có hiệu ứng, khóa hình đã tìm và chuyển sang thẻ chưa tìm tiếp theo. Có thể chọn thứ tự tìm bằng các thẻ còn lại. Chạm sai nhắc nhẹ, không mất tiến độ. Gợi ý khoanh vùng hình đang chọn, không tự hoàn thành. Tìm đủ năm hình thì chúc mừng, nhận sticker một lần và hiện Màn tiếp; màn ngẫu nhiên tránh lặp ngay chủ đề trước. Có thể chọn chủ đề cho màn đầu, hướng dẫn/giọng Việt cho từng hình.

## Tích hợp và kiểm tra

Bốn card ở menu, tabs và direct/reload/Back của cả bốn URL. Hướng dẫn mẫu độc lập không thay tiến độ hoặc thưởng; sound bật/tắt/nghe lại, một voice, lỗi không chặn chơi. SVG/MP3/Nunito tự host; không gọi AI/TTS trong runtime. Hỗ trợ bàn phím và touch, nút ≥44 px, reduced motion, 360/768/1440 px và axe. Kiểm logic thật và tương tác browser; không gọi dispatch hoàn thành từ test. Giữ các kiểm tra animation chậm và 11 cặp mới.

| Task                          | Phụ thuộc | Tiêu chí và kiểm tra                                                                                           |
| ----------------------------- | --------- | -------------------------------------------------------------------------------------------------------------- |
| K01 — Contract và dữ liệu     | Không     | Hai route, ba bản sao/số, màu cố định, năm chủ đề đúng hình; kiểm catalog/asset                                |
| K02 — Logic tìm số            | K01       | Đủ 45 khoảng, không mất/lặp số, chạm đúng theo thứ tự, không tính lặp, callback đề cũ bị bỏ qua                |
| K03 — UI tìm số               | K02       | Range/preset, số đen → màu, lời yêu cầu và tự chuyển sau chúc mừng, gợi ý không tính hộ                        |
| K04 — Minh họa trốn tìm       | K01       | Năm cảnh riêng, 24 hình dễ phân biệt, tự vẽ SVG và ghi nguồn; xem thực trên mobile/desktop                     |
| K05 — Logic trốn tìm          | K01       | Đúng chủ đề, vị trí không đè nhau, chọn/tìm/khóa, gợi ý, màn tiếp tránh lặp                                    |
| K06 — UI trốn tìm             | K04, K05  | Bảng hình + tranh, hiệu ứng tìm thấy, đủ hình mới có Màn tiếp; tìm sai không mất tiến độ                       |
| K07 — Hướng dẫn, âm và routes | K03, K06  | Bốn card/URL, hai hướng dẫn riêng, voice Việt, timer/cleanup, rewards một lần/round                            |
| K08 — Nghiệm thu              | K07       | Unit/component, E2E hai bài/các chủ đề, touch/keyboard/axe, lint/type/build/format, giữ dữ liệu và ghi kết quả |

## Kết quả nghiệm thu

K01–K08 đã hoàn thành ngày 2026-10-15: 88 unit/component, 12 E2E hai bài mới và 8 E2E hồi quy phần bị ảnh hưởng đều đạt; build/format/lint/typecheck, routing/gateway 5/5 và compiled smoke đạt. Đã xem UI năm chủ đề/mobile và kiểm audio thực. Chi tiết, phạm vi và giới hạn tại [nhật ký kiểm tra](verification.md) và [checklist](../PORTFOLIO_TASKS.md). Không thêm API/DB/dependency hoặc lưu hồ sơ trẻ.
