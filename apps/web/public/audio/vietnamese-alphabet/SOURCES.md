# Giọng đọc tiếng Việt

29 fileMP3 cập nhật ngày2026-10-14 từ Microsoft Edge Read Aloud, giọng nữ **vi-VN-HoaiMyNeural**, tốc độ **-15%**, bằng edge-tts7.3.0. Text đầu vào chỉ có âm học vần rồi từ, như `a. cái ca.`; không đọc lời dẫn “Chữ” hoặc “Ví dụ”. Dấu chấm tạo khoảng nghỉ giữa chữ và từ; `manifest.json` lưu nguyên transcript, thời lượng vàSHA256 cho từng file. Đọc **âm học vần**: a, á, ớ, bờ, cờ, dờ, đờ, e, ê, gờ, hờ, i, cờ, lờ, mờ, nờ, o, ô, ơ, pờ, cờ, rờ, sờ, tờ, u, ư, vờ, xờ, i. c/k/q cùng âm cờ; i/y cùng âm i. Ví dụ `bờ. con bò.`, không đọc tên chữ bê/xê/dê. Manifest readingMode=phonics, revision3;19 đoạn được tạo lại,10 nguyên âm đã đúng được giữ nguyên.

File phục vụ cùng origin từ `/audio/vietnamese-alphabet/`; khi sử dụng không gọi dịch vụTTS, không lấy giọng mặc định máy, không gửi dữ liệu trẻ. Âm thanh bắt đầu từ click/tap của người dùng. `ended` mới bắt đầu thời gian đóng3 giây. Nếu trình duyệt chặn phát hoặc file không tải được, hiện lỗi và nút thử lại.

Muốn thay bằng giọng thu thật, giữ tên file, tăng revision trong audioUrl và cập nhật transcript/checksum/thời lượng trong manifest. Test kiểm tra đủ29 file và decode audio thật trên Chromium; đánh giá nghe chủ quan hoặc thiết bị iOS/Android thực cần người nghe kiểm tra thêm.
