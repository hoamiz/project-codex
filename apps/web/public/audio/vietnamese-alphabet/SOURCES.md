# Giọng đọc tiếng Việt

29 fileMP3 tạo ngày2026-10-13 từ Microsoft Edge Read Aloud, giọng nữ **vi-VN-HoaiMyNeural**, tốc độ **-15%**, bằng edge-tts7.3.0. Text đầu vào là tên chữ tiếng Việt rồi từ ví dụ; `manifest.json` lưu nguyên transcript, thời lượng vàSHA256 cho từng file. Đọc **tên chữ** (bê/xê/dê…), không phải bài luyện âm ghép vần bờ/cờ/dờ.

File phục vụ cùng origin từ `/audio/vietnamese-alphabet/`; khi sử dụng không gọi dịch vụTTS, không lấy giọng mặc định máy, không gửi dữ liệu trẻ. Âm thanh bắt đầu từ click/tap của người dùng. `ended` mới bắt đầu thời gian đóng3 giây. Nếu trình duyệt chặn phát hoặc file không tải được, hiện lỗi và nút thử lại.

Muốn thay bằng giọng thu thật, giữ tên file và cập nhật transcript/checksum/thời lượng trong manifest. Test kiểm tra đủ29 file và decode audio thật trên Chromium; đánh giá nghe chủ quan hoặc thiết bị iOS/Android thực cần người nghe kiểm tra thêm.
