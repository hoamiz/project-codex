# PJ7 — Bé vui học tập

Kế hoạch ngày 2026-10-15 cho project-codex, **đã triển khai và đạt nghiệm thu trong workspace**. Đây là PJ7 đang hoạt động theo yêu cầu mới; [Scan Studio](scan-studio-plan.md) được lưu trữ, chưa tự gán thành PJ8. Trạng thái thực tế của L01–L30 nằm trong [PORTFOLIO_TASKS.md](../PORTFOLIO_TASKS.md), prompt thực hiện tại [RUN_PJ7_TASKS.md](../RUN_PJ7_TASKS.md). Đọc [AGENTS.md](../AGENTS.md) trước khi triển khai.

Cập nhật tiếp theo ngày 2026-10-15: PJ7 đã mở rộng thành **bốn bài**. Bài 3 `/projects/kids-learning/number-search` và Bài 4 `/projects/kids-learning/hide-and-seek` theo [hợp đồng K01–K08](kids-learning-extensions-plan.md). L01–L30 giữ tên và nhật ký nghiệm thu ban đầu; K01–K08 bổ sung phạm vi mới, không đổi DB hoặc tạo project thứ tám.

## 1. Sản phẩm và phạm vi

Tên **Bé vui học tập**, slug kids-learning. Nhóm tuổi thiết kế đề xuất 4–7 tuổi, có người lớn chọn bài/khoảng số. Giao diện tiếng Việt, sáng, vui, ít chữ, không tính giờ hoặc phạt trẻ khi sai.

| Trang           | URL                              | Nội dung                                              |
| --------------- | -------------------------------- | ----------------------------------------------------- |
| Chọn bài        | /projects/kids-learning          | Hai card bài tập lớn, minh họa dễ hiểu                |
| Nối số với hình | /projects/kids-learning/matching | Chọn khoảng số và bảng ba cột                         |
| Đồ nét vui nhộn | /projects/kids-learning/tracing  | Một cặp hình cố định và một đường ngẫu nhiên mỗi lượt |

MVP gồm đúng hai loại bài bên dưới, hỗ trợ chuột, cảm ứng và bút. Thêm card thứ bảy vào portfolio khi triển khai. Sáu demo hiện có tiếp tục hoạt động. Không gộp vào PJ6; có thể tái dùng font Nunito tự host nếu giấy phép cho phép.

Người dùng đã duyệt cả sáu cập nhật: hướng dẫn bằng bàn tay mẫu, mức Dễ/Vừa với **Dễ mặc định**, chạm hình để đếm, giọng hướng dẫn tiếng Việt có bật/tắt, chọn nhanh khoảng số và sticker. Đây là phạm vi bắt buộc của bản đầu, không còn là gợi ý để sau.

## 2. Bài 1 — Nối số với số lượng hình

### Bố cục và sinh đề

Ba cột theo đúng thứ tự: **số | bảng trắng để vẽ | nhóm hình**. Cột giữa không có đường gợi ý hoặc đồ trang trí; chỉ có điểm nối ở hai mép và các nét trẻ đang/đã nối. Mỗi hàng số và nhóm hình có điểm nối đủ lớn ở mép bảng, không yêu cầu vẽ đè lên số hoặc hình.

- Khoảng mặc định 1–5. Khoảng áp dụng gồm cả start và end, tạo end − start + 1 cặp, từ 2 đến 10 cặp.
- Cột trái có mỗi số nguyên trong khoảng đúng một lần, theo thứ tự tăng dần. Cột phải có đúng một nhóm tương ứng mỗi số, xáo trộn bằng Fisher–Yates. Nếu xáo trộn ra thứ tự hoàn toàn ban đầu thì đổi chỗ hai nhóm; không cần cấm mọi cặp cùng hàng.
- Mỗi nhóm chứa đúng n hình, ví dụ số 3 tương ứng ba ngôi sao. Đề xuất một loại hình cho mỗi đề, chọn từ sao/táo/cá; các hình được bố trí theo ô để trẻ đếm. Không hiện chữ số đáp án ở nhóm hình hoặc thêm hình trang trí có thể bị đếm nhầm.
- Các cặp có ID ổn định và đáp án dựa trên giá trị n, không dựa theo vị trí hàng. Xáo trộn không làm mất hoặc lặp số.
- Với 10 nhóm, cho trang cuộn dọc; ba cột và bảng vẽ cùng hệ tọa độ/chiều cao, không cuộn từng cột riêng hoặc thu hình quá nhỏ.

### Quy tắc nhập start/end

Giữ bất biến **1 ≤ start < end ≤ 10**, tương ứng start ≤ 9 và end ≥ 2. Giá trị là số nguyên. Xử lý theo **ô vừa sửa**, giữ nguyên ô còn lại:

- Sửa start: nếu giá trị không hợp lệ hoặc không thỏa bất biến, đặt **start = end − 1**.
- Sửa end: nếu giá trị không hợp lệ hoặc không thỏa bất biến, đặt **end = start + 1**.
- Không tự sửa cả hai ô hoặc clamp trước rồi làm mất quy tắc ô vừa sửa. Giá trị rỗng, không hữu hạn hoặc thập phân cũng dùng quy tắc thay thế trên.
- Cho gõ bản nháp, chỉ chuẩn hóa khi blur, Enter, bước tăng/giảm hoặc bấm Bắt đầu; không sửa giữa lúc trẻ/người lớn đang gõ số 10. Khi bấm Bắt đầu, commit ô đang sửa một lần trước sinh đề. Không mở đề với bản nháp chưa hợp lệ.
- Đổi khoảng trong phần cài đặt chưa làm mất bàn hiện tại; chỉ Bắt đầu/Tạo bài mới mới sinh đề và xóa trạng thái cũ. Các thao tác commit có thứ tự, không đọc state React chưa cập nhật.
- Có nút chọn nhanh **1–3 / 1–5 / 1–10**. Bấm preset đặt cả hai ô cùng lúc thành một khoảng hợp lệ và không tự bắt đầu bài. Intent preset thay bản nháp hiện tại; blur từ ô cũ không được ghi đè preset. Sau đó vẫn có thể sửa từng ô theo quy tắc trên.

| Trước khi sửa   | Ô và giá trị vừa nhập | Kết quả         |
| --------------- | --------------------- | --------------- |
| start 1, end 5  | start = 7             | start 4, end 5  |
| start 3, end 6  | end = 2               | start 3, end 4  |
| start 1, end 2  | start = 10            | start 1, end 2  |
| start 9, end 10 | end = 1               | start 9, end 10 |
| start 2, end 5  | start = 0             | start 4, end 5  |
| start 2, end 5  | end = 11              | start 2, end 3  |
| start 1, end 5  | end = 10              | start 1, end 10 |
| start 3, end 7  | start để trống        | start 6, end 7  |
| start 3, end 7  | end = 3.5             | start 3, end 4  |

### Vẽ, làm gọn nét và chấm

1. Bắt đầu từ điểm nối của một số chưa đúng, kéo qua bảng trắng đến điểm nối của một nhóm hình chưa khóa. Có preview nét đang vẽ. MVP vẽ từ trái sang phải; có hướng dẫn ngắn, không tự chấm một nét bắt đầu giữa bảng.
2. Khi thả tại nhóm hợp lệ, bỏ toàn bộ nét preview, nét vòng/thừa và điểm lấy mẫu. Hiện **một đường cong Bézier gọn** nối đúng hai điểm, đầu nét tròn; không lưu cả nét thô lẫn nét đã làm gọn. Dạng cong dựa trên hai điểm nối, không giữ các vòng nguệch ngoạc. Các đường đúng được phép cắt nhau.
3. Chấm theo số và số lượng hình, không theo độ đẹp hoặc độ giống đường vẽ. Ví dụ 3 → ba sao là đúng dù kéo hơi run.
4. **Đúng**: đường xanh lá, dấu tick và hiệu ứng chúc mừng ngắn. Khóa cả số và nhóm hình; không cho vẽ lại hoặc xóa cặp đó trong đề hiện tại. Hiệu ứng chạy đúng một lần cho cặp vừa hoàn thành.
5. **Sai**: đường đỏ, biểu tượng thử lại và lời nhắc nhẹ. Không khóa nguồn/đích. Mỗi số có tối đa một nét sai; khi bắt đầu vẽ lại từ số đó, xóa nét sai cũ trước preview mới. Không xóa các nét đúng hoặc nét sai của số khác.
6. Thả ngoài điểm nối, nét không bắt đầu từ số, click không kéo, pointercancel hoặc mất capture: bỏ nét đang vẽ, không chấm sai/đúng và không để lại rác. Thả vào đích đã khóa cũng hủy nét; không đè đường mới lên cặp đã đúng.
7. Đúng toàn bộ: hiện thông báo hoàn thành và nút Bài mới/Chọn bài, không tự đổi đề. Tạo đề mới bằng hành động rõ ràng mới bỏ khóa và xóa nét cũ.

Có thể chọn số rồi chọn nhóm hình bằng click/tap hoặc bàn phím để dùng cùng bộ chấm và đường cong; đây là cách thao tác bổ sung. Không tự chọn đáp án đúng. Trạng thái đúng/sai không chỉ biểu đạt bằng màu.

### Chạm hình để tập đếm

Mỗi hình trong nhóm có ID riêng. Chạm hoặc kích hoạt bằng bàn phím làm hình sáng lên và tăng số đã đếm; chạm lại cùng hình không tăng tiếp. Có nút **Đếm lại** cho nhóm đó, chỉ xóa trạng thái đếm, không xóa nét/khóa của bài nối. Ban đầu không hiện số đáp án; số đã đếm chỉ xuất hiện khi trẻ chủ động đếm.

Nút đếm hình và điểm nối là hai vùng thao tác riêng; đếm không được tự chọn đích hoặc nối đáp án. Giữ màu đánh dấu đếm khác màu xanh đúng/đỏ sai. Có thể tiếp tục đếm ở nhóm đã nối đúng nhưng không thay trạng thái cặp. Tạo đề mới xóa bộ đếm từng nhóm; hướng dẫn mẫu không sửa bộ đếm của đề thật.

## 3. Bài 2 — Đồ nét để đưa bạn tới đích

### Cặp hình và đường mẫu

Mỗi lượt có **một ô bài tập riêng** gồm hình start bên trái, phần vẽ ở giữa và hình end bên phải. Các cặp được định nghĩa cố định, không ghép ngẫu nhiên hai ảnh rời:

| Cặp                        | Hoạt cảnh khi làm đúng                   |
| -------------------------- | ---------------------------------------- |
| Ong → hoa                  | Ong bay theo đường tới hoa, dừng hút mật |
| Chó → xương                | Chó chạy tới xương, dừng gặm             |
| Bò → cỏ                    | Bò đi tới cỏ, dừng ăn                    |
| Bạn nhỏ → nhà              | Bạn nhỏ đi theo đường rồi vào nhà        |
| Thỏ → cà rốt               | Thỏ bước đi rồi ăn cà rốt                |
| Mèo → cá                   | Mèo bước đi rồi ăn cá                    |
| Vịt → ao nước              | Vịt đi tới ao rồi bơi                    |
| Chim → tổ                  | Chim bay theo nét rồi đậu vào tổ         |
| Ô tô gia đình → nhà        | Xe lăn bánh rồi dừng trước nhà           |
| Bạn nhỏ → trường học       | Bạn nhỏ đi bộ rồi vào trường             |
| Bạn nhỏ đạp xe → công viên | Đạp xe theo nét rồi dừng ở công viên     |

Khi bấm Bắt đầu/Bài tiếp, chọn ngẫu nhiên một cặp và một mẫu đường: **thẳng, zigzag hoặc sóng**. Nếu có lựa chọn khác thì tránh lặp ngay toàn bộ cặp + mẫu + tham số của lượt trước; vẫn được lặp một cặp với mẫu khác. Không đổi đề khi rerender, resize, thử lại hoặc animation kết thúc. RNG có thể inject để test tái lập.

Đường mẫu là nét chấm chấm, có điểm bắt đầu/kết thúc rõ. Hình nhân vật/đích nằm ngoài vùng tô và không che phần nét cần đi theo. Mẫu nằm trong một hành lang ngang, không tự cắt, có khoảng cách đủ rộng giữa các đoạn để tránh chấm nhầm. Mẫu zigzag/sóng thay đổi số nhịp và độ cao trong giới hạn thân thiện với trẻ; không tạo ngẫu nhiên đường quá sát mép hoặc quá khó trên mobile.

### Cách đồ nét và kiểm hoàn thành

- Trẻ bắt đầu ở điểm start, giữ bút và đi theo nét chấm tới end. Nhận một nét liên tục cho một lần thử; nhả sớm là chưa hoàn thành, không ghép nhiều nét rời để lấp đủ đường.
- Trong lúc vẽ có nét màu tương phản và tiến trình phủ đường. Sai không phát âm thanh chê hoặc tính phạt. Nhả bút khi chưa đạt thì giữ một nét thử với lời nhắc; khi bắt đầu lại, bỏ nét thử trước.
- Chấm **đường đi thực**, không chỉ kiểm hai đầu mút, thời gian giữ bút hoặc khoảng cách start/end. Bài này không áp dụng cơ chế thay nét thô bằng Bézier của Bài 1 trước khi chấm.
- Đổi điểm pointer sang tọa độ vùng vẽ, nội suy/lấy mẫu đều theo chiều dài khoảng 4 CSS px để không lệ thuộc tần số pointermove/DPR. Không thay nét người dùng bằng đường mẫu trước khi kiểm.
- Điều kiện đầu/cuối: trong điểm neo bán kính 22 CSS px (vùng chạm 44 px), cùng một pointer hợp lệ. Dung sai dọc đường dùng riêng cho từng mức. Kiểm thứ tự tiến dọc đường mẫu và độ phủ liên tục; cho phép run tay/quay lại ngắn trong dung sai.
- Mặc định dùng profile **Dễ**. Ngưỡng ban đầu để hiệu chỉnh tại L12: bán kính dung sai Dễ 18 CSS px, Vừa 12 CSS px; cả hai cần ≥90% chiều dài mẫu được phủ, ≥90% chiều dài nét nằm trong hành lang, tỷ lệ chiều dài nét/mẫu trong khoảng 0,8–2,0. Mẫu phải đủ tách biệt theo dung sai Dễ để kéo thẳng tắt qua sóng/zigzag bị từ chối. Ghi ngưỡng thực và lý do sau thử mobile, không nới chỉ để test đạt.
- Bắt buộc có ca: đồ đúng hơi run được nhận; chạm hai đầu không kéo, đồ nửa đường, vẽ tắt qua zigzag/sóng, tô nguệch ngoạc, bắt đầu sai, nét đảo toàn bộ và nhiều nét rời không được tính hoàn thành.
- Đi theo một đường thẳng bằng ít sự kiện pointer vẫn hợp lệ nếu hình học đúng; không ép số lượng event hoặc tốc độ không cần thiết.

### Animation và trở lại ô bài

Sau khi chấm đạt, khóa nhập và thay **chính ô bài đó** bằng hoạt cảnh; không phủ toàn trang hoặc tự đổi cặp. Theo cập nhật ngày 2026-10-15, nhân vật di chuyển chậm trong 7,2 giây theo nét vẽ đã được chấm đúng, làm mượt nhẹ khi hiển thị và giữ nguyên điểm đầu/cuối. Sau đó có 2,4 giây cho hành động tại đích (ăn/hút mật, bơi, về tổ, vào nhà/trường hoặc đỗ xe); toàn cảnh khoảng 9,6 giây. Bước chân/nhún nhẹ, tăng và giảm tốc êm; resize giữ tiến độ, ẩn trang tạm dừng cả di chuyển lẫn động tác. Bộ chấm vẫn nhận nét gốc, không dùng nét đã làm mượt.

Khi hoạt cảnh kết thúc, khôi phục ô ban đầu với **cùng cặp, cùng đường mẫu**, trạng thái Đã hoàn thành và nút Vẽ lại/Bài tiếp. Vẽ lại bỏ kết quả và cho đồ lại cùng đề; Bài tiếp mới random đề mới. Không tự phát lại hoạt cảnh khi khôi phục hoặc rerender.

Nếu ẩn tab, tạm dừng timeline và tiếp tục khi hiện; đổi bài/rời route thì hủy timeline/listener và không chạy callback của lượt cũ. Có callback kết thúc thật và watchdog có giới hạn để không mắc kẹt khi animation bị hủy/lỗi. Với prefers-reduced-motion, dùng cảnh tĩnh/fade ngắn rồi khôi phục đúng cùng trạng thái.

## 4. Giao diện và thao tác chung

- Tông kem/trắng với xanh mint, vàng, hồng và xanh trời; font Nunito tiếng Việt dễ đọc, số lớn, minh họa SVG đồng bộ. Chữ và số có tương phản đủ, không dùng emoji hệ điều hành làm asset đếm chính.
- Trang chọn bài có hai card: Nối số và Đồ nét. Trong bài chỉ có hướng dẫn ngắn, bảng chơi, tiến độ và nút cần thiết; phần chọn khoảng tách khỏi bảng trắng.
- Có nút Xem cách chơi, mức Dễ/Vừa, bật/tắt âm thanh và xem bộ sưu tập trong vị trí dễ tìm; phần cài đặt có thể thu gọn để bảng chơi vẫn đơn giản. Dễ không tự thay khoảng số 1–5 mặc định hoặc quy tắc khóa cặp đúng.
- Hit target tối thiểu 44 CSS px, tránh vô hiệu hóa zoom toàn trang. Chỉ touch-action: none trong vùng đang vẽ; còn lại vẫn cuộn trang được. Không chặn thao tác hai ngón hoặc pointer phụ làm sai state.
- Pointer Events + capture theo một pointerId. Phân biệt click, drag, cancel; nhấc bút ngoài vùng, mất capture, đổi hướng màn hình và rời route phải dọn preview.
- Lưu anchor/ID và tọa độ chuẩn hóa; ResizeObserver tính lại vị trí render. Resize không sinh đề hoặc chấm lại; nếu đang vẽ thì hủy lần thử, các cặp đúng giữ nguyên và gắn đúng hàng.
- Bài 1 có chọn nguồn/đích bằng bàn phím. Bài 2 có chế độ bút bàn phím: focus vùng vẽ, Space bật/tắt bút, phím mũi tên di chuyển, Enter nộp; vẫn dùng cùng bộ chấm, không tự hoàn thành. Giải thích rõ phím và không chặn phím khi đang nhập start/end.
- aria-live thông báo kết quả sau lần thử, không đọc mỗi điểm pointer. Có focus nhìn rõ, không chỉ dùng màu, reduced motion và không nháy chớp nhanh.

### Hướng dẫn bằng bàn tay mẫu

Nút **Xem cách chơi** chạy một lượt minh họa kéo nối hoặc đồ đường bằng bàn tay. Dùng bảng mẫu tách khỏi state bài thật; không tô nét gợi ý thường trực trên cột trắng. Có Bỏ qua/Đóng và có thể xem lại bằng nút; không tự chạy mỗi lần mở đề.

Kết thúc hoặc bỏ qua trả về nguyên đề, bộ đếm, nét đúng/sai và tiến độ trước đó, không sinh đề hoặc cấp sticker. Tạm khóa nhập bài thật trong khi minh họa; hidden/unmount/đổi bài hủy callback cũ. Reduced motion dùng các khung minh họa tĩnh có lời hướng dẫn. Âm hướng dẫn, nếu bật, không được chồng với âm bài thật.

### Mức độ Dễ mặc định

Lần vào app hoặc reload bắt đầu ở **Dễ**, có thể chủ động chọn Vừa trong cài đặt. Dễ/Vừa thay độ rộng đường chấm và dung sai của Bài 2; đề xuất nét mẫu 6/4 CSS px và dung sai 18/12 CSS px. Cả hai vẫn cần đồ đúng đường, không chỉ chạm hai đầu. Mẫu dùng chung phải đủ rộng cho profile Dễ; nếu màn hình hẹp thì giảm số nhịp hoặc tăng vùng vẽ thay vì chấp nhận đường tắt.

Chốt profile vào đề khi bấm Bắt đầu/Bài tiếp; thay lựa chọn chỉ áp dụng đề mới, không chấm lại nét hiện tại. Vẽ lại giữ cùng đề và profile. Khoảng số vẫn do start/end hoặc preset quyết định; Bài 1 luôn chấm đúng số lượng và khóa cặp đúng như nhau ở hai mức.

### Giọng hướng dẫn tiếng Việt

Dùng giọng Việt rõ, chậm vừa và các clip tự host: hướng dẫn nối số, 11 câu theo cặp đồ nét, lời chúc mừng và “Con thử lại nhé”. Nội dung ngắn, không âm thanh chê. Nếu thêm lời đọc lúc đếm thì đọc đúng số vừa đếm, không tự đọc đáp án trước thao tác.

Âm thanh mặc định bật nhưng chỉ phát sau thao tác chủ động như Bắt đầu, Xem cách chơi hoặc Nghe hướng dẫn, không autoplay khi vừa tải trang. Có công tắc tắt/bật rõ; tắt dừng ngay âm đang phát và giữ lựa chọn trên thiết bị khi lưu được. Một thời điểm chỉ có một giọng; lượt mới/đổi route/hide/unmount hủy audio cũ. Kết quả chỉ phát một lần, không phát theo từng pointermove/rerender.

Không phụ thuộc giọng tiếng Việt của hệ điều hành hoặc TTS runtime. MP3 có transcript, nguồn/license, duration và checksum; khi đổi âm tăng revision URL. Nếu lỗi tải/play hoặc bị chặn autoplay, bài vẫn chơi và chấm bình thường, có nút nghe lại; không chuyển sang giọng tiếng Anh. Kiểm decode, native playback và chồng tiếng, ghi rõ nếu chưa nghe đánh giá trên thiết bị thật.

### Sticker và bộ sưu tập trên thiết bị

Đề xuất bộ 12 sticker con vật. Hoàn thành toàn bộ đề nối số hoặc được bộ chấm đồ nét xác nhận đạt sẽ mở một sticker chưa có. Khi đã đủ bộ vẫn chúc mừng, không cộng điểm/xếp hạng. Sticker được cấp theo chuyển trạng thái hoàn thành của đề, không theo callback animation hoặc mỗi cặp số đúng.

Mỗi đề có roundId và cờ đã cấp thưởng: rerender, xem hướng dẫn, phát lại animation hoặc Vẽ lại cùng đề không cấp thêm; Bài mới/Bài tiếp tạo đề mới. Bộ sưu tập lưu như tập ID hợp lệ, có version và giới hạn 12 mục trong localStorage riêng của kids-learning; không lưu tên/tuổi hoặc nét vẽ. Mất mạng không ảnh hưởng mở sticker.

Trang chọn bài có nút **Bộ sưu tập**. Nếu storage bị chặn, đầy hoặc dữ liệu hỏng, dùng bộ sưu tập trong phiên và thông báo ngắn khi cần; bài học vẫn chạy. Chỉ bộ sưu tập và lựa chọn âm thanh được lưu, reload chưa phục hồi đề/nét hoặc thay mặc định Dễ. Asset sticker có nguồn/license và tương phản rõ; không thêm nhịp streak hoặc áp lực thời gian.

## 5. Kiến trúc phù hợp project hiện tại

React 19 + TypeScript + Tailwind; SVG viewBox + Pointer Events cho đường, CSS/SVG hoặc Web Animations API cho hoạt cảnh. Không cần Three.js, AI, API trả phí hay thư viện canvas lớn. Logic sinh đề/chấm/state là hàm thuần TypeScript, tách khỏi React để test.

Các module thực tế dưới apps/web/src/features/kids-learning:

- index.tsx: chọn bài, routes, mức độ, công cụ và modal; learning.css giới hạn theme.
- lessons.ts: kiểu, 11 cặp, ba mẫu, profile Dễ/Vừa và sticker IDs.
- range-core.ts, matching-core.ts, drawing-core.ts, tracing-core.ts: quy tắc và hình học thuần; lesson-state.ts: reducers và token.
- drawing-board.tsx: SVG/Pointer Events và đo kích thước; matching-page.tsx/tracing-page.tsx: bảng bài học và bút bàn phím.
- range-settings.tsx/count-helper.tsx: draft/commit/preset và đếm hình độc lập.
- lesson-animation.tsx: timeline/hidden/cleanup/fallback; tutorial.tsx/learning-dialog.tsx: mẫu riêng, focus/inert/scroll lock.
- learning-audio.ts: một giọng, token/cancel/retry/mute; rewards-core.ts/collection.tsx: cấp một lần/đề, storage và bộ sưu tập.
- SVG, Nunito và MP3 dưới apps/web/public; SOURCES, OFL và manifest ghi nguồn/transcript/checksum.

Node/Express + PostgreSQL tiếp tục phục vụ portfolio. Migration mới dự kiến **apps/api/db/migrations/006_kids_learning.sql** chỉ mở whitelist/thêm card và cập nhật seed không ghi đè dữ liệu đã chỉnh. Kiểm lại số migration tiếp theo khi triển khai; giữ 001–005. Plan Scan Studio đang lưu trữ không chiếm migration 006.

MVP không cần bảng tài khoản/hồ sơ trẻ hoặc API chấm từng nét. Đề, nét và tiến độ của lượt hiện tại giữ trong bộ nhớ; reload trở lại cài đặt với mức Dễ. Chỉ bộ sưu tập sticker và lựa chọn âm thanh lưu localStorage có version; không upload nét hoặc thu thông tin trẻ. Nút Bài mới quyết định đổi đề; không tự reset khi mạng mất.

Tái dùng ServiceReadiness hiện có: lần mở đầu vẫn cần API health sẵn sàng theo cơ chế chung, sau khi vào bài thì mất kết nối không làm mất đề/nét. Cập nhật danh sách demo trên màn chờ từ danh sách hiện tại sang đủ bảy tên và kiểm hồi phục, không hứa offline hoàn toàn hoặc tự đổi global gate trong MVP.

## 6. Task nhỏ và tiêu chí kiểm tra

L01–L30 là checklist mới; các task S01–S24 chỉ thuộc kế hoạch Scan Studio lưu trữ. Đường dẫn dưới đây là dự kiến, điều chỉnh cho hợp cấu trúc khi làm. Chỉ đánh dấu hoàn thành sau kiểm tra có kết quả.

| Task                              | Phụ thuộc                              | Phạm vi                                    | Tiêu chí và kiểm tra                                                                                                                                            |
| --------------------------------- | -------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01 — Contract và dữ liệu bài học | Không                                  | Types, lessons.ts, plan                    | Chốt hai bài, 11 cặp, ba mẫu, Dễ mặc định, sáu cập nhật đã duyệt và state; giữ scope, không tự thêm loại bài                                                    |
| L02 — Minh họa và font            | L01                                    | SVG, font, SOURCES                         | Đủ hình đếm và 11 cặp; SVG dễ nhìn, nhóm 1–10 đếm đúng; nguồn/license, xem trực quan desktop/mobile                                                             |
| L03 — Chuẩn hóa khoảng số         | L01                                    | range-core.ts                              | Quy tắc ô sửa sau, draft/commit, mọi cạnh 1/10, bằng nhau/rỗng/thập phân; unit đầy đủ bảng ví dụ và bất biến                                                    |
| L04 — Sinh đề nối số              | L01, L03                               | matching-core.ts                           | Mỗi giá trị một cặp, đúng số hình, xáo phải, không đổi lúc render; test mọi khoảng hợp lệ và RNG cố định                                                        |
| L05 — Tọa độ và đường vẽ          | L01                                    | drawing-core.ts                            | Pointer → viewBox/CSS px, khoảng cách/lấy mẫu/Bézier, giới hạn bộ nhớ; test scroll/resize/DPR và dữ liệu không hữu hạn                                          |
| L06 — Chấm nối và nét chuẩn       | L04, L05                               | matching-core.ts                           | Chấm ID/giá trị, một Bézier đầu tròn mỗi lần nối, bỏ raw/vòng thừa; test đường chéo cắt nhau, đích ngoài/khóa                                                   |
| L07 — State khóa và thử lại       | L06                                    | lesson-state.ts                            | Đúng khóa hai đầu, sai đỏ không khóa, vẽ lại xóa sai của nguồn đó; test giữ cặp đúng, hoàn thành và reset rõ ràng                                               |
| L08 — Bảng SVG và Pointer Events  | L05                                    | drawing-board.tsx                          | Capture một pointer, preview, cancel/outside/lostcapture/cleanup; test drag thật chuột/cảm ứng/bút và không sinh stroke rác                                     |
| L09 — Form start/end              | L03                                    | Matching settings                          | Gõ 10/blur/Enter/Bắt đầu theo thứ tự; chỉ đổi ô vừa sửa, không sinh đề với draft sai; component test và thao tác thật                                           |
| L10 — Giao diện nối số            | L02, L04, L07, L08, L09                | matching-page.tsx                          | Đúng ba cột, 2–10 cặp, nét xanh/đỏ/tick/hiệu ứng, không vẽ lại cặp đúng; click/keyboard và hoàn thành không tự đổi đề                                           |
| L11 — Sinh mẫu đồ nét             | L01, L05                               | tracing-core.ts, lessons.ts                | Cặp cố định + thẳng/zigzag/sóng; mẫu đủ tách biệt với cả profile Dễ/Vừa, không sát mép; test seed/resize/retry và RNG                                           |
| L12 — Bộ chấm đồ nét              | L11                                    | tracing-core.ts                            | Chấm đầu/cuối/độ phủ/hành lang/thứ tự/chiều dài cho Dễ/Vừa; run tay hợp lý đạt nhưng đường tắt/thiếu/nét rời bị loại ở cả hai; ghi ngưỡng                       |
| L13 — State bài đồ nét            | L12                                    | lesson-state.ts                            | Một lần thử liên tục, bỏ nét cũ khi thử lại, chỉ vào animation khi đạt; token lượt ngăn callback cũ, reset/đổi bài có test                                      |
| L14 — Bảng đồ nét                 | L02, L08, L11, L13                     | tracing-page.tsx, drawing-board.tsx        | Start/hướng dẫn/end và nét chấm rõ; pointer thật dùng đúng grader, không tự thay bằng đường mẫu trước chấm                                                      |
| L15 — Bốn hoạt cảnh               | L02, L11                               | lesson-animation.tsx                       | Ong/hoa, chó/xương, bò/cỏ, bé/nhà đúng cặp; di chuyển theo path, hành động nhận diện được; xem từng cảnh thực                                                   |
| L16 — Animation và khôi phục      | L13, L14, L15                          | lesson-animation.tsx, lesson-state.ts      | Thay đúng ô, kết thúc về cùng đề, không phát lặp; Vẽ lại/Bài tiếp khác nhau; test hidden/resume/unmount/callback cũ/reduced motion/watchdog                     |
| L17 — Trang chọn bài và routes    | L10, L16                               | index.tsx, main.tsx, learning.css          | Hai card bài, lazy route, shell riêng sáng/vui/ít chữ; direct/reload/Back và đổi bài dọn state/animation đúng                                                   |
| L18 — Migration và seed card      | L01                                    | API migration/seed/upgrade tests           | Thêm kids-learning từ DB sáu project không reset/seed bắt buộc; migration lặp/rollback lỗi, whitelist bảy URL, metadata cũ giữ nguyên                           |
| L19 — Portfolio và màn hồi phục   | L17, L18                               | Portfolio/public API/readiness/smoke       | Card thứ bảy đúng URL/thứ tự/phân loại; màn chờ đủ tên, network recovery giữ bài và không replay mutation; sáu demo cũ còn nguyên                               |
| L20 — Hướng dẫn bàn tay mẫu       | L10, L14, L16, L17                     | tutorial.tsx, learning-dialog.tsx          | Xem một lượt, bỏ qua/xem lại; trả nguyên đề/nét/bộ đếm, không chấm hoặc thưởng; test reduced motion/hidden/unmount/callback cũ                                  |
| L21 — Mức Dễ mặc định             | L11, L12, L17                          | lessons.ts, tracing-core.ts, index.tsx     | Dễ khi vào/reload, chọn Vừa tùy ý; width/tolerance theo profile cố định trong đề, không đổi khoảng số; test nét run và đường tắt ở cả hai                       |
| L22 — Chạm hình để đếm            | L04, L10                               | count-helper.tsx, matching board           | Mỗi hình chỉ tăng một lần, Đếm lại riêng nhóm, keyboard; không tự chọn đích/đổi nét hoặc khóa, reset đúng khi đề mới                                            |
| L23 — Âm hướng dẫn tiếng Việt     | L02, L10, L16, L17, L20                | learning-audio.ts, clips/manifest/SOURCES  | Clip Việt tự host/transcript/duration/SHA/revision; bật-tắt, một giọng, chỉ phát sau thao tác; native decode/play/retry/mute/hidden, lỗi không chặn bài         |
| L24 — Chọn nhanh khoảng số        | L03, L09, L17                          | range-settings.tsx                         | 1–3/1–5/1–10 đặt hai ô nguyên tử, thắng blur draft cũ; không tự sinh đề; test preset rồi sửa tay theo quy tắc ô vừa sửa                                         |
| L25 — Sticker và bộ sưu tập       | L02, L07, L13, L16, L17                | rewards-core.ts, collection.tsx            | 12 sticker, một phần thưởng/đề; tutorial/rerender/animation/Vẽ lại không cấp lặp; version/dedupe, reload, storage hỏng/chặn/đầy vẫn chơi                        |
| L26 — Mobile, bàn phím và a11y    | L17, L19, L20–L25                      | CSS, controls, keyboard pen                | 360/768/1440, 10 cặp không tràn; controls mới keyboard/focus/axe, ≥44px, scroll/touch/reduced motion; xem tutorial/âm/sticker và hiệu chỉnh cả hai profile      |
| L27 — Kiểm nghiệm nối số          | L10, L19, L20–L26                      | Unit/component/E2E matching                | Range/presets/blur, Bézier/khóa/sai thay/cancel/resize; đếm không tăng lặp hoặc tự nối; tutorial giữ state, mute/lỗi audio, sticker một lần; pointer/touch thật |
| L28 — Kiểm nghiệm đồ nét          | L12, L16, L19, L20, L21, L23, L25, L26 | Unit/component/E2E tracing                 | Ba mẫu × 11 cặp × Dễ/Vừa; nét run đạt/đường tắt sai, 11 cảnh về cùng đề; tutorial/voice/rewards không lặp, hidden/unmount/reduced motion                        |
| L29 — Hồi quy và compiled/deploy  | L18, L19, L27, L28                     | Existing checks/scripts/CI                 | Full checks/compiled/deploy/container phù hợp; DB 6→7, SVG/audio/font MIME, direct/SPA, assets tự host, preserved data/config, không gọi API trả phí            |
| L30 — Nghiệm thu và tài liệu      | L01–L29                                | README/architecture/verification/checklist | Kết quả thực cho hai bài và sáu cập nhật, Dễ mặc định; review comment/license/audio/sticker/UI, secret/artifact, startup nếu cần; mọi tiêu chí bắt buộc đạt     |

## 7. Kế hoạch kiểm thử và nghiệm thu

- Unit có ý nghĩa cho range/generation/geometry/state/grader; component test cho thứ tự commit form, locks, retry và callback animation. Kiểm hết 45 khoảng số hợp lệ, ba preset, 11 cặp × ba mẫu × hai mức, không chỉ ví dụ số 3.
- Browser dùng Pointer Events thật, native mouse và touch; tạo nét qua tọa độ đo từ UI, không gọi trực tiếp hàm hoàn thành hoặc sửa state. Pen cần test logic PointerEvent, ghi rõ nếu chưa có thiết bị bút thật.
- Chụp và xem màn chọn bài, nối sai/đúng/10 cặp, ba mẫu, 11 cảnh, hướng dẫn bàn tay và bộ sưu tập ở các viewport; axe không thay kiểm đếm hình hoặc chất lượng hoạt cảnh. Ghi rõ chưa thử Safari/iPad/Android thật nếu chỉ chạy Chromium.
- Bổ sung ca đếm không trùng, không vô tình nối khi chạm hình; tutorial không đổi tiến độ; audio native/mute/chặn autoplay/lỗi/cancel; sticker một lần/đề, đủ bộ, reload và storage hỏng/chặn/đầy. Không dùng mock play() thay kiểm native decode/phát.
- API/DB dùng schema/fixture riêng, test nâng cấp sáu project và metadata đã chỉnh; không reset DB người dùng. Chạy suite dùng chung DB tuần tự.
- Cuối lượt triển khai: npm run check, npm run format:check, npm run test:deploy, container checks phù hợp và git diff --check. Cập nhật counts/runtime smoke bảy project, giữ nhật ký lịch sử sáu demo.
- Tự test sau từng task, sửa và kiểm lại trước đánh dấu; ghi lệnh/pass/fail/skip/hạn chế. Chưa có code thì không đánh dấu task hoặc dùng kiểm Markdown thay bằng chứng hoạt động của bài tập.

## 8. Ý tưởng còn để sau

Sáu cập nhật đã duyệt nằm trong MVP và L20–L25. Những ý tưởng sau vẫn chưa tự triển khai:

- Chọn thêm chủ đề hình đếm hoặc mẫu vòng cung/mê cung.
- Lưu và phục hồi cả đề/nét/tiến độ học ngay trên thiết bị; bản đầu chỉ lưu sticker và lựa chọn âm thanh.

MVP không có tài khoản trẻ, leaderboard, quảng cáo, AI hoặc dịch vụ phát âm trả phí.

## 9. Kết quả nghiệm thu (2026-10-15)

L01–L30 được kiểm theo checklist và bằng chứng thực tế. Toàn bộ check đạt 51 API, 78 unit/component và 99 E2E; sau cải thiện header/dialog/URL, cả 40 E2E PJ7 được chạy lại và đạt, thêm ca resize giữ cặp đúng đạt. Compiled, format, deploy tests 5/5, container TLS/HTTPS/restart/dump-restore và khởi động dịch vụ đều đạt. Dữ liệu sáu demo cũ, cấu hình, migrations001–005 và lockfile giữ nguyên. Chi tiết lệnh/phạm vi/hạn chế ở [verification](verification.md); nhật ký task là nguồn trạng thái.

Kiểm trên Chromium với native mouse, CDP touch/pen và bàn phím; chưa thử thiết bị bút thật, Safari/iOS/Android thật hoặc đánh giá nghe chủ quan trên các máy đó. Không dùng kết quả local/container thay bằng chứng deploy hoặc GitHub Actions. Hướng dẫn khởi động cloud đã cập nhật và đọc lại; chưa publish snapshot, commit/push hoặc deploy ở lượt này.
