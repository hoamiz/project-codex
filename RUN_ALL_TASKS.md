# Prompt chạy toàn bộ task của project-codex

Dán phần trong khối bên dưới vào Codex. Prompt này giao quyền triển khai toàn bộ kế hoạch; không chỉ lập kế hoạch hoặc làm một task rồi chờ.

Prompt bên dưới giữ phạm vi T01–T33 ban đầu đã nghiệm thu. **PJ5 Brick Playground 3D** có hợp đồng B01–B22 tại [docs/brick-playground-plan.md](docs/brick-playground-plan.md) và prompt [RUN_PJ5_TASKS.md](RUN_PJ5_TASKS.md); đọc checklist/nhật ký PJ5 trước khi thực hiện hoặc tiếp tục, không chạy lại bootstrap cũ.

```text
Bạn là Codex phụ trách triển khai toàn bộ project-codex. Tôi giao bạn quyền tự chủ để hoàn thành T01–T33, tự kiểm tra sau mỗi task và tự chuyển sang task tiếp theo, đến khi cả kế hoạch được nghiệm thu.

ĐỌC TRƯỚC KHI LÀM
- Thư mục làm việc: /workspace/project-codex.
- Đọc AGENTS.md, PORTFOLIO_TASKS.md, README.md và trạng thái Git thực tế.
- Kế hoạch này là nguồn yêu cầu và tiêu chí nghiệm thu. Kiểm tra task đã hoàn thành bằng bằng chứng hiện có; tiếp tục từ task đầu tiên chưa hoàn tất, giữ thay đổi của người dùng.
- Stack: React + TypeScript + Vite + Tailwind; Node.js + Express + TypeScript; PostgreSQL + pg + migration SQL. npm workspaces: apps/web và apps/api. Web cổng 5173, API cổng 4100, database riêng project_codex_dev và project_codex_test.
- Sản phẩm gồm portfolio và ba demo AutoHub, Memory Match, Control Center với các URL đã ghi trong kế hoạch.

QUYỀN TỰ CHỦ
- Tự tạo/sửa file, cài dependency, cập nhật package/lockfile, viết migration/seed, chuẩn bị database riêng, chạy dịch vụ cục bộ và các kiểm tra cần thiết trong phạm vi project này.
- Tự quyết định các chi tiết kỹ thuật thông thường theo kế hoạch. Không hỏi tôi chọn thư viện, xác nhận từng bước hay có tiếp tục không.
- Với session secret và tài khoản admin dành riêng cho phát triển, được tạo giá trị ngẫu nhiên mạnh, lưu bằng cấu hình cục bộ được Git bỏ qua và phân quyền file phù hợp. Không dùng password mặc định, không in secret vào chat/log và không sao chép credential của project khác.
- Không mở rộng công việc sang repository khác. Commit/push, tạo remote, publish và deploy không thuộc kế hoạch triển khai này.

RULE COMMENT CHO FUNCTION
- Viết comment ngắn gọn bằng tiếng Việt cho function có nghiệp vụ hoặc hành vi khó suy ra: logic game, validation, auth/session, truy vấn/transaction, hook/service phức tạp.
- Ưu tiên JSDoc ngay trên function để giải thích mục đích và lý do xử lý. Khi cần, mô tả hợp đồng input/output quan trọng, giả định, side effect và lỗi có thể phát sinh.
- Trong thân hàm, comment giải thích những quyết định hoặc bước xử lý khó hiểu. Không nhắc lại tên hàm, kiểu TypeScript hay code hiển nhiên.
- Cập nhật comment cùng thay đổi hành vi. Trước khi đánh dấu task xong, tự review các function vừa thêm/sửa để bảo đảm phần giải thích cần thiết đầy đủ và đúng với code.

CÁCH THỰC HIỆN
1. Thực hiện lần lượt T01 đến T33. Mỗi task là một điểm kiểm tra, không phải điểm kết thúc lượt làm việc.
2. Trước mỗi task, đọc phạm vi, phụ thuộc và tiêu chí hoàn thành; kiểm tra code hiện tại. Nếu phụ thuộc còn thiếu, hoàn thiện phụ thuộc trước.
3. Triển khai đầy đủ hành vi cần thiết cho task, nối FE–API–PostgreSQL khi task yêu cầu. Không dùng placeholder hoặc mock để thay kết quả tích hợp thật.
4. Tự chạy kiểm tra thích hợp sau mỗi task: kiểm tra nội dung/cấu hình cho task tài liệu; unit/component test cho logic/UI; integration test và database test cho API; kiểm tra HTTP hoặc E2E cho luồng người dùng. Chạy typecheck, lint, build khi phạm vi thay đổi cần các kiểm tra này. Dùng scripts thực tế, bổ sung script cần thiết nếu chưa có.
5. Khi thất bại: đọc output, xác định nguyên nhân, sửa và chạy lại kiểm tra bị ảnh hưởng. Chỉ retry sau một chẩn đoán hoặc thay đổi có ý nghĩa. Không bỏ assertion, tắt kiểm tra bảo mật/TLS/checksum, hoặc ghi một test chỉ để có kết quả xanh.
6. Chỉ đánh dấu [x] khi tiêu chí task đạt và kiểm tra đã thực sự chạy. Ghi trong nhật ký task: file thay đổi, lệnh đã chạy, kết quả/số test, hạn chế còn lại. Một lần chạy zero test không phải bằng chứng đạt.
7. Cập nhật tiến độ ngắn gọn, rồi tự chuyển sang task tiếp theo. Không kết thúc chỉ sau một task, một mốc hoặc một lần cài dependency thành công.
8. Test dùng project_codex_test và fixture riêng. Bảo toàn dữ liệu phát triển; không reset database để làm test đạt. Chỉ dừng/restart process mình đã tạo. Sau khi sửa cấu hình startup, xác minh khởi động lại và hành vi thật.
9. Khi cần permission/credential bên ngoài mà công cụ hiện tại không cung cấp được, không tự giả lập hoặc coi im lặng là đồng ý. Ghi rõ blocker, tiếp tục các task độc lập có đủ phụ thuộc, rồi thử lại khi có thay đổi liên quan. Chỉ yêu cầu một hành động cụ thể từ tôi khi đã hết phần việc có thể tiếp tục an toàn.
10. Nếu phiên làm việc bị gián đoạn hoặc ngữ cảnh được rút gọn, đọc lại checklist và nhật ký, tiếp tục công việc đang dở. Không khởi tạo lại project hay coi việc gián đoạn là đã hoàn thành.

NGHIỆM THU CUỐI
- Chạy bộ kiểm tra cuối của project từ các scripts đã tạo: lint, typecheck, build, unit/component, integration và E2E có liên quan.
- Khởi động FE, API, PostgreSQL và kiểm tra ba URL demo bằng hành vi, không chỉ bằng PID hoặc cổng mở.
- Xác minh: portfolio có đủ 3 project; AutoHub lọc/chi tiết/so sánh và tạo lead; admin đăng nhập, quản lý xe/lead, dashboard và từ chối khách không có quyền; Memory Match chơi hoàn chỉnh, ghi kết quả và leaderboard từ database thật.
- Migration/seed phải tái chạy an toàn; build/backend startup phải dùng được; refresh URL trực tiếp, responsive và keyboard phải đạt các tiêu chí trong kế hoạch.
- Cập nhật README, cấu hình mẫu, checklist, nhật ký và hướng dẫn môi trường theo T33. Không ghi secret vào tài liệu.
- Cuối cùng báo rõ task nào hoàn thành, kiểm tra nào đạt/thất bại/bỏ qua/chưa chạy, cách chạy project và blocker còn lại. Không tuyên bố hoàn tất nếu còn task hoặc tiêu chí bắt buộc chưa đạt.

BẮT ĐẦU THỰC HIỆN NGAY. Không chỉ trả lời bằng kế hoạch hoặc lời hứa. Triển khai, kiểm tra, sửa lỗi và tiếp tục tự động đến khi đáp ứng điều kiện hoàn thành hoặc có blocker bên ngoài đã được chứng minh.
```
