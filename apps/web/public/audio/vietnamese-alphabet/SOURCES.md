# Giọng đọc tiếng Việt

29 fileMP3 cập nhật ngày2026-10-14 từ Microsoft Edge Read Aloud, giọng nữ **vi-VN-HoaiMyNeural**, bằng edge-tts7.3.0. Chỉ đọc âm rồi từ, như `a. cái ca.`, không đọc lời dẫn “Chữ” hoặc “Ví dụ”. `manifest.json` lưu transcript/thời lượng/SHA256, readingMode=phonics/revision7 và lựa chọn k=ca/q=cu.

Bảng đọc hiện tại: a, á, ớ, bờ, cờ, dờ, đờ, e, ê, gờ, hờ, i, ca, lờ, mờ, nờ, o, ô, ơ, pờ, cu, rờ, sờ, tờ, u, ư, vờ, xờ, i. K đọc “ca”, q đọc “cu” theo yêu cầu người dùng; i/y cùng âm i.

Năm clip h/k/q/s/x tạo lại bằng cách tổng hợp phần âm và từ riêng, ghép với400ms nghỉ thêm. Ban đầu h/s/x đọc âm đầu tốc độ-30% (đã thay ở revision5–7 bên dưới); k/q và từ minh họa-15%. Âm đầu tăng âm lượng10%; waveform đã kiểm peak không clipping, không cắt đầu tiếng thở/fricative. Các trường soundRate/soundVolume/exampleRate/pauseMs/synthesis ghi cấu hình từng clip.24 clip khác được giữ nguyên ở-15%.

Revision5 (2026-10-14): Hoài My đọc “sờ” gần như không có âm xát nên nghe thành “trờ”. Phần âm của s tạo lại từ chữ viết `sở` (trường `soundText`) ở-15%, âm lượng gốc, vì cách viết này cho tiếng “sh” rõ và được người dùng nghe duyệt; transcript vẫn là `sờ. con sóc.`.

Revision6 (2026-10-14): Hoài My đọc “xờ” không có âm xát (chỉ nghe “ờ”); thử các cách viết khác và ghép tiếng xì vào nguyên âm đều nghe rời. Phần âm của x vì vậy lấy từ Google Translate TTS (gTTS2.5.4, `vi`, chế độ chậm), có âm xát s thật, chuẩn hóa đỉnh về-6dB; nghỉ400ms rồi “xe đạp.” giọng Hoài My-15%. Clip này đổi giọng giữa âm và từ, được người dùng nghe duyệt. Google Translate TTS là dịch vụ không chính thức; nên thay bằng bản thu giọng thật trước khi phát hành công khai.

Revision7 (2026-10-14): “hờ” đọc ở-30% nghe gần “hà”. Phần âm của h tạo lại bằng Hoài My ở-15% (như phần lớn các chữ), nghỉ400ms rồi “con hổ.”-15%; cả hai phần chuẩn hóa đỉnh về-6dB (trường `normalizedPeakDb`), được người dùng nghe duyệt.

File phục vụ cùng origin từ `/audio/vietnamese-alphabet/`; khi sử dụng không gọi dịch vụTTS, không lấy giọng mặc định máy, không gửi dữ liệu trẻ. Âm thanh bắt đầu từ click/tap của người dùng. `ended` mới bắt đầu thời gian đóng3 giây. Nếu trình duyệt chặn phát hoặc file không tải được, hiện lỗi và nút thử lại.

Muốn thay bằng giọng thu thật, giữ tên file, tăng revision trong audioUrl và cập nhật transcript/checksum/thời lượng trong manifest. Test kiểm tra đủ29 file và decode audio thật trên Chromium; đánh giá nghe chủ quan hoặc thiết bị iOS/Android thực cần người nghe kiểm tra thêm.
