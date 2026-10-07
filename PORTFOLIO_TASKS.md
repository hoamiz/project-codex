# project-codex — Kế hoạch triển khai portfolio dành cho Codex

> Checklist triển khai và nhật ký nghiệm thu project-codex. T01–T33 được đánh dấu sau khi kiểm tra đạt; bằng chứng cuối trong docs/verification.md.

## 1. Mục tiêu và cấu trúc dự án mới

Website portfolio hiện có bốn demo hoạt động thật. T01–T33 bên dưới ghi phạm vi ba demo ban đầu; PJ4 được bổ sung theo R01–R07 ở cuối file và dùng làm tiêu chí hiện tại cho số project/route.

| Project | URL chính | Nội dung |
| --- | --- | --- |
| AutoHub | `/projects/autohub` | Website bán xe, tìm kiếm, chi tiết, so sánh, yêu cầu tư vấn/lái thử |
| Memory Match | `/projects/memory-match` | Game lật thẻ, ba độ khó, lưu kết quả, bảng xếp hạng |
| Control Center | `/projects/admin` | Đăng nhập, quản lý xe, yêu cầu khách hàng, thống kê |
| Room Studio 3D | `/projects/room-studio` | Custom phòng 3D, nội thất, màu/ánh sáng, lưu/chia sẻ và tạo bản sao |

Trang `/` giới thiệu chủ portfolio và hiển thị bốn project. Giao diện dùng tiếng Việt, có đường quay về portfolio từ từng demo. Các thông tin cá nhân chưa được cung cấp dùng nội dung mẫu được ghi rõ trong cấu hình; không tự nhận kinh nghiệm hay thành tích.

**Project:** `/workspace/project-codex`, một repository Git cục bộ mới. Frontend, backend, cấu hình và dữ liệu được tạo riêng trong project này. Không sao chép hoặc sửa mã, dependency, biến môi trường và dữ liệu từ các project khác. Remote origin đã trỏ tới `https://github.com/hoamiz/project-codex.git`; Repository GitHub `hoamiz/project-codex` đã tồn tại và nhánh main đã nhận toàn bộ mã nguồn/tài liệu.

**Cách triển khai:** khởi tạo mới React + TypeScript + Vite + Tailwind tại `apps/web` và Node.js + Express + TypeScript tại `apps/api`. Root package có tên `project-codex`; dùng npm workspaces và một `package-lock.json` ở gốc. Hai ứng dụng được xây mới theo hợp đồng bên dưới.

**Stack chốt cho kế hoạch:** React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query; Node.js, Express, TypeScript; PostgreSQL, `pg`, migration SQL có phiên bản. Dùng Vitest/Testing Library cho logic và component, Supertest cho API, Playwright cho các luồng người dùng chính. Các package được quản lý bằng npm workspaces, có tên `@project-codex/web` và `@project-codex/api`.

**Phạm vi bản đầu:** admin một vai trò; không thanh toán, đặt cọc, gửi email, upload ảnh hay tích hợp OAuth. Yêu cầu tư vấn/lái thử được lưu và xử lý trong admin. Ảnh xe dùng tài nguyên tĩnh có quyền sử dụng; admin chọn từ ảnh có sẵn. Nhân viên, upload, email, thanh toán và triển khai cloud là giai đoạn sau.

## 2. Quy tắc thực hiện cho Codex

1. Đọc tài liệu này, `AGENTS.md` và trạng thái Git tại `/workspace/project-codex` trước khi sửa. Chỉ làm việc trong project này; dùng thư mục hiện có, không tạo worktree nếu người dùng chưa yêu cầu.
2. Khi được giao chạy toàn bộ kế hoạch, thực hiện liên tục T01–T33 theo `RUN_ALL_TASKS.md`, tự kiểm tra sau mỗi task rồi chuyển sang task tiếp theo. Chỉ bắt đầu task khi phụ thuộc đã hoàn thành và còn đúng với mã hiện tại. Một task hoàn thành không phải lý do dừng để hỏi có tiếp tục không. Khi chỉ được giao một task cụ thể, giữ phạm vi task đó.
3. Mỗi task nêu rõ phạm vi. Có thể sửa file cấu hình, package và lockfile cần thiết cho việc triển khai đã được giao, nhưng không refactor hoặc sửa app khác ngoài phạm vi. Giữ các thay đổi của người dùng.
4. Dùng cấu hình riêng của project; không ghi secret vào Git, log hay chat. Database phát triển là `project_codex_dev`, database kiểm thử là `project_codex_test`. Không đọc hoặc dùng lại `.env` hay database của project khác. Không reset dữ liệu, chạy migration lên database bên ngoài hoặc publish/deploy khi chưa được giao.
5. API mới dùng prefix `/api`; frontend gọi URL tương đối và Vite proxy `/api` về backend. Tránh lưu URL localhost cố định trong component.
6. Query SQL luôn có tham số. Validate dữ liệu tại backend. Lỗi validation, không có quyền, không tìm thấy và lỗi hệ thống phải có status riêng. Không trả stack trace hoặc thông tin kết nối cho client.
7. Không dùng dữ liệu giả để đánh dấu luồng tích hợp đã hoàn thành. Mock chỉ dùng trong test hoặc khi xây component trước API; ghi rõ khi còn mock.
8. Chạy kiểm tra đúng phạm vi task. Không đánh dấu hoàn thành khi test chưa chạy, chạy zero test hoặc test cần thiết còn thất bại chưa giải thích.
9. Sau mỗi task, cập nhật checkbox trong bản kế hoạch này và thêm bản ghi: file thay đổi, lệnh kiểm tra, kết quả, hạn chế còn lại. Không tự commit/push hoặc deploy chỉ vì task đã xong.
10. Trong chế độ chạy toàn bộ, được tạo session secret và credential admin ngẫu nhiên mạnh cho phát triển, lưu trong file local bị Git bỏ qua; không in giá trị. Tự khắc phục lỗi và tiếp tục các task độc lập nếu một task bị chặn bởi yêu cầu bên ngoài. Không đánh dấu task bị chặn là hoàn thành.
11. Thêm comment ngắn gọn bằng tiếng Việt để giải thích các function có nghiệp vụ hoặc hành vi khó suy ra: logic game, validation, auth/session, truy vấn/transaction và hook/service phức tạp. Ưu tiên JSDoc trên function, giải thích mục đích và lý do xử lý; ghi hợp đồng input/output quan trọng, giả định, side effect hoặc lỗi có thể phát sinh khi cần. Comment trong thân hàm giải thích quyết định khó hiểu. Tránh nhắc lại tên hàm, kiểu TypeScript hoặc code hiển nhiên. Khi đổi hành vi phải cập nhật comment; kiểm tra phần này trước khi đánh dấu task hoàn thành.

**Chạy tự động toàn bộ:** đọc [RUN_ALL_TASKS.md](RUN_ALL_TASKS.md), thực hiện prompt trong đó và tiếp tục đến nghiệm thu cuối. Giữ các task dưới đây làm điểm kiểm tra tiến độ.

Mẫu yêu cầu cho một lượt:

```text
Đọc /workspace/project-codex/PORTFOLIO_TASKS.md và /workspace/project-codex/AGENTS.md.
Thực hiện task Txx tại /workspace/project-codex.
Kiểm tra phụ thuộc trước, làm đúng phạm vi, chạy kiểm tra trong tiêu chí hoàn thành.
Sau khi có kết quả kiểm tra, cập nhật checklist và nhật ký task.
Nếu bị chặn, ghi nguyên nhân cụ thể và phần nào đã kiểm tra được.
```

## 3. Cấu trúc đích và hợp đồng chung

```text
project-codex/
  apps/
    web/
      src/
        app/             # router, provider, cấu hình
        components/      # component dùng chung
        features/
          portfolio/
          autohub/
          admin/
          memory-match/
        lib/             # API client, tiện ích
    api/
      src/
        routes/
        services/
        repositories/
        validation/
      db/
        migrations/
  docs/                  # hợp đồng API, chạy ứng dụng, quyết định kỹ thuật
```

Không tạo folder rỗng chỉ để khớp sơ đồ. Tạo khi task cần.

**Địa chỉ khi phát triển:** React trên cổng 5173, API trên cổng 4100. PostgreSQL dùng database riêng `project_codex_dev` và `project_codex_test`; có thể dùng PostgreSQL cục bộ hoặc container riêng với volume của project. Proxy Vite hỗ trợ cookie cùng origin. Khi host frontend ở một origin, server phải có SPA fallback để mở trực tiếp URL từng project vẫn hoạt động; `/api` và file asset không đi qua fallback.

**URL frontend bổ sung:** `/projects/autohub/cars/:slug`, `/projects/autohub/compare`, `/projects/admin/login`, `/projects/admin/cars`, `/projects/admin/leads`. Route chưa biết hiển thị trang 404 có nút về portfolio.

**Response API:** tài nguyên đơn trả `{ data: ... }`; danh sách có phân trang trả `{ data: [...], pagination: { page, pageSize, total, totalPages } }`; lỗi trả `{ error: { code, message, fields? } }`. Mọi endpoint của backend mới nằm dưới `/api`.

**Xe:** `id`, `slug`, `brand`, `model`, `year`, `priceVnd`, `mileageKm`, `fuelType`, `transmission`, `seats`, `description`, `status`, `imagePaths`, `createdAt`, `updatedAt`. `priceVnd` là số nguyên VND trong phạm vi số nguyên an toàn của JavaScript; backend chuyển kiểu PostgreSQL một cách tường minh. `status`: `available`, `reserved`, `sold`, `archived`. Chỉ public ba trạng thái đầu, mặc định danh sách xe có thể mua là `available`.

**Lead:** `id`, `carId`, `type`, `name`, `phone`, `email?`, `preferredAt?`, `message?`, `status`, `createdAt`, `updatedAt`, idempotency key duy nhất cho một lần gửi. `type`: `consultation`, `test_drive`; `status`: `new`, `in_progress`, `completed`, `cancelled`. Khi lái thử phải có ngày tương lai. Múi giờ nghiệp vụ mặc định `Asia/Ho_Chi_Minh`, hiển thị rõ trong form và dùng cho thống kê theo ngày; DB dùng `timestamptz`, API trả ISO timestamp.

**Portfolio project:** seed bốn demo `autohub`, `memory-match`, `admin`, `room-studio` trong database riêng. URL demo được lấy từ dữ liệu có whitelist route nội bộ.

**Auth:** một admin, password băm bằng Node `crypto.scrypt` với salt ngẫu nhiên; session lưu PostgreSQL, cookie HttpOnly, SameSite phù hợp và Secure khi production. Session secret lấy từ môi trường. Các thao tác ghi có kiểm tra CSRF/origin; frontend route guard chỉ hỗ trợ UX, backend luôn kiểm tra quyền.

**Game:** ba độ khó 6/8/12 cặp. Backend tạo bàn, giữ mặt thẻ và trạng thái phiên chơi, xử lý lượt lật và tính thời gian. Client không gửi điểm/thời gian làm nguồn sự thật. Leaderboard xếp theo số lượt tăng dần, thời gian tăng dần, rồi thời điểm hoàn thành. Mỗi phiên chỉ có một kết quả.

## 4. Checklist và thứ tự thực hiện

### Nền tảng

- [x] **T01 — Kiểm kê và ghi hợp đồng triển khai**
  - Phụ thuộc: không.
  - Làm: kiểm tra skeleton `project-codex`, Node/npm và chuẩn bị PostgreSQL với database riêng `project_codex_dev`/`project_codex_test`, cấu hình riêng và tên biến cần thiết. Ghi `docs/architecture.md` và `docs/api-contract.md` theo các lựa chọn trên. Không lấy cấu hình từ project khác.
  - Hoàn thành khi: danh sách route, model, package, biến cấu hình và lệnh chạy đã được ghi; xác nhận database phát triển truy cập được bằng query đọc; không in credential. Nếu database bị chặn, tiếp tục các task FE độc lập và ghi blocker cho task DB.

- [x] **T02 — Khởi tạo frontend React/TypeScript/Tailwind**
  - Phụ thuộc: T01.
  - Làm: tạo `apps/web`, cấu hình Vite, Tailwind, React Router, TypeScript strict. Thêm các route chính với trang tạm và 404, proxy `/api` về API cổng 4100. Đăng ký workspace `@project-codex/web` và cập nhật lockfile chung ở root.
  - Hoàn thành khi: chạy frontend được; ba URL project mở trực tiếp được; build và typecheck của package web đạt.

- [x] **T03 — Lệnh chạy và bộ khung kiểm tra**
  - Phụ thuộc: T02.
  - Làm: khởi tạo workspace `@project-codex/api` từ đầu với Express/TypeScript/pg. Tách Express app khỏi `listen` để Supertest import được. Thêm `/api/health`, JSON middleware, xử lý 404/lỗi và test runner. Root có lệnh `dev:web`, `dev:api`, `dev`, `build`, `typecheck`, `test`; API có build/start thực sự và đọc cấu hình riêng.
  - Hoàn thành khi: FE gọi được health qua proxy; test health chạy và đạt; API typecheck/build đạt; server khởi động được từ output build; lệnh root trỏ đúng workspace, không gọi thư mục hay server của project khác.

- [x] **T04 — Migration SQL có phiên bản**
  - Phụ thuộc: T01, T03.
  - Làm: tạo runner migration trong `apps/api`, bảng lịch sử migration, transaction cho từng migration và lệnh `db:migrate`. Chỉ đọc cấu hình của project-codex, kiểm tra target database trước khi áp dụng; không có bước reset dữ liệu tự động.
  - Hoàn thành khi: chạy migration hai lần không chạy lại file đã áp dụng; migration lỗi rollback; dữ liệu project-codex đã có được giữ nguyên. Kiểm tra trên database `project_codex_test`.

- [x] **T05 — Schema cho ba demo**
  - Phụ thuộc: T04.
  - Làm: migration cho `portfolio_projects`, `cars`, `leads`, `admin_users`, session auth, `game_sessions`, `game_results`. Thêm unique slug, FK, CHECK/enum status, index cho lọc và leaderboard; chỉ rõ chính sách archive xe đã có lead.
  - Hoàn thành khi: migration lên database test đạt; DB từ chối giá âm, slug trùng, lead trỏ xe không tồn tại và hai kết quả cùng một phiên game.

- [x] **T06 — Dữ liệu mẫu tái chạy được**
  - Phụ thuộc: T05.
  - Làm: seed 3 project mới, khoảng 12 xe với nhiều hãng/giá/trạng thái và ảnh tĩnh có thông tin nguồn. Chỉ seed lead mẫu bằng lệnh demo tường minh; không đưa password admin cố định vào seed.
  - Hoàn thành khi: seed hai lần không nhân đôi dữ liệu hoặc ghi đè dữ liệu người dùng đã sửa; cả ba demo có metadata và URL đúng; danh sách xe có ảnh hợp lệ.

- [x] **T07 — Bộ giao diện chung**
  - Phụ thuộc: T02.
  - Làm: layout, project navigation, button, input, select, modal, table, pagination, thông báo loading/error/empty. Dùng palette thống nhất, focus rõ và label cho form.
  - Hoàn thành khi: trang component mẫu dùng bàn phím được; modal quản lý focus/đóng đúng; kiểm tra component tương tác chính đạt. Không viết test chỉ để đếm class CSS.

### Portfolio

- [x] **T08 — API metadata portfolio**
  - Phụ thuộc: T03, T06.
  - Làm: `GET /api/portfolio/projects`, đọc đúng ba demo từ database project-codex theo response đã chốt.
  - Hoàn thành khi: integration test nhận 3 slug `autohub`, `memory-match`, `admin` và route demo đúng; lỗi DB trả lỗi hệ thống có kiểm soát.

- [x] **T09 — Trang portfolio và điều hướng demo**
  - Phụ thuộc: T07, T08.
  - Làm: trang `/` có giới thiệu, kỹ năng và 3 project card lấy từ API; mỗi card có ảnh, mô tả, stack và nút trải nghiệm. Tạo cấu hình nội dung cá nhân dễ sửa và trạng thái lỗi/tải lại.
  - Hoàn thành khi: nhấn từng card đi đúng demo; back/forward browser hoạt động; trang mobile không tràn ngang; có hành vi rõ khi API lỗi.

### AutoHub

- [x] **T10 — API danh sách xe và bộ lọc**
  - Phụ thuộc: T03, T06.
  - Làm: `GET /api/cars`, hỗ trợ search, brand, khoảng giá, year, status public, sort và phân trang. Whitelist sort, giới hạn pageSize; cung cấp lựa chọn hãng từ dữ liệu có thể public.
  - Hoàn thành khi: test lọc kết hợp, phân trang, không có kết quả và query sai đạt; SQL có tham số; không lộ xe archived.

- [x] **T11 — Giao diện danh sách xe**
  - Phụ thuộc: T07, T10.
  - Làm: trang AutoHub có giới thiệu, car card, tìm kiếm debounce, filter, sort, pagination. Đồng bộ bộ lọc với URL query; cancel/ignore request cũ; hiển thị loading/error/empty.
  - Hoàn thành khi: reload hoặc chia sẻ URL giữ bộ lọc; thay filter quay về trang 1; dữ liệu khớp API; thao tác nhanh không hiện kết quả request cũ.

- [x] **T12 — API chi tiết xe**
  - Phụ thuộc: T10.
  - Làm: `GET /api/cars/:slug`, trả gallery, thông số và trạng thái public; phân biệt slug không có với DB lỗi. Thêm `GET /api/cars/by-ids?ids=...` cho tối đa 3 ID public dùng khi so sánh; đăng ký route tĩnh trước `:slug`.
  - Hoàn thành khi: test xe có thật, không tồn tại và archived đạt với status đúng; giá và thông số đúng kiểu theo hợp đồng.

- [x] **T13 — Giao diện chi tiết xe**
  - Phụ thuộc: T07, T12.
  - Làm: gallery, giá VND, bảng thông số, mô tả, CTA tư vấn/lái thử; URL `/projects/autohub/cars/:slug`.
  - Hoàn thành khi: mở URL trực tiếp có dữ liệu đúng; slug sai có thông báo không tìm thấy; CTA phản ánh trạng thái xe; gallery có alt và dùng bàn phím được.

- [x] **T14 — API gửi yêu cầu tư vấn/lái thử**
  - Phụ thuộc: T05, T12.
  - Làm: `POST /api/leads`; validate thông tin liên hệ, carId, trạng thái xe, ngày lái thử. Có giới hạn tần suất và idempotency cho retry cùng lần gửi; không gửi email.
  - Hoàn thành khi: integration test payload hợp lệ tạo một lead; lỗi trả field error; retry không tạo lead trùng; public không thể lấy danh sách thông tin khách hàng.

- [x] **T15 — Form tư vấn/lái thử**
  - Phụ thuộc: T13, T14.
  - Làm: modal hoặc khu vực form với lựa chọn loại yêu cầu; map field error từ API; khóa gửi trong lúc pending; thông báo thành công và cho gửi yêu cầu mới có chủ ý.
  - Hoàn thành khi: yêu cầu từ UI xuất hiện trong DB; lỗi backend hiển thị đúng field; retry dùng cùng idempotency key; ngày và múi giờ rõ ràng.

- [x] **T16 — So sánh và yêu thích xe**
  - Phụ thuộc: T11, T13.
  - Làm: tối đa 3 xe để so sánh; trang compare dùng ID trong query và dữ liệu API; yêu thích lưu localStorage, chưa cần tài khoản.
  - Hoàn thành khi: reload giữ yêu thích; xe thứ 4 bị từ chối rõ ràng; link so sánh dùng được ở browser mới; xử lý được ID không còn public và localStorage lỗi/cũ.

### Control Center

- [x] **T17 — Đăng nhập và bảo vệ API admin**
  - Phụ thuộc: T03, T05.
  - Làm: bootstrap admin qua lệnh riêng và input/biến môi trường an toàn; hash scrypt, session PostgreSQL, login/logout/me, rate limit login, middleware admin, CSRF/origin check cho thao tác ghi. Endpoint `/api/auth/login`, `/logout`, `/me`.
  - Hoàn thành khi: test mật khẩu đúng/sai, session hết hạn, logout, request chưa đăng nhập và request ghi khác origin đạt; session ID đổi sau login; DB/log không chứa password rõ. Thiếu credential thì ghi yêu cầu cấu hình, không tự tạo tài khoản với password mặc định.

- [x] **T18 — Giao diện đăng nhập và admin layout**
  - Phụ thuộc: T07, T17.
  - Làm: login, route guard, sidebar, trạng thái kiểm tra session, logout; redirect sau login chỉ chấp nhận route nội bộ admin.
  - Hoàn thành khi: refresh trang admin vẫn giữ session hợp lệ; chưa login chuyển về login; logout hết quyền; lỗi login rõ ràng mà không lộ tài khoản tồn tại.

- [x] **T19 — API quản lý xe**
  - Phụ thuộc: T12, T17.
  - Làm: endpoint admin list/detail/create/update/archive dưới `/api/admin/cars`; validate dữ liệu, slug, ảnh whitelist; archive thay xóa vật lý xe có lead. Xử lý xung đột update theo version/updatedAt.
  - Hoàn thành khi: CRUD/archive test đạt; không có session bị từ chối; update cũ nhận 409; archive không làm mất lead và xe không còn public.

- [x] **T20 — Bảng quản lý xe**
  - Phụ thuộc: T18, T19.
  - Làm: table có search/filter/page, badge trạng thái, link sửa, thao tác archive có xác nhận và xử lý lỗi; không hiển thị thành công trước khi API xác nhận.
  - Hoàn thành khi: dữ liệu/total đúng API; archive cập nhật UI và AutoHub; loading/empty/error đầy đủ; phiên hết hạn quay về login.

- [x] **T21 — Form thêm/sửa xe**
  - Phụ thuộc: T20.
  - Làm: form theo model, chọn ảnh tĩnh, field validation, xử lý slug trùng và update conflict; cảnh báo rời trang khi còn thay đổi chưa lưu.
  - Hoàn thành khi: tạo và sửa được từ UI, đọc lại đúng DB; dữ liệu lỗi không ghi; gặp 409 cho tải bản mới và giữ dữ liệu đang nhập để người dùng quyết định.

- [x] **T22 — API quản lý yêu cầu khách hàng**
  - Phụ thuộc: T14, T17.
  - Làm: `/api/admin/leads` có search/filter/page/detail và update status; trả thông tin xe liên quan; validate status và xử lý update conflict.
  - Hoàn thành khi: test lọc và chuyển trạng thái đạt; phiên chưa có quyền không lấy được thông tin khách; cập nhật không làm đổi thông tin liên hệ gốc.

- [x] **T23 — Giao diện quản lý yêu cầu**
  - Phụ thuộc: T18, T22.
  - Làm: bảng yêu cầu, xem chi tiết, lọc loại/trạng thái, đổi trạng thái, xử lý conflict và phiên hết hạn.
  - Hoàn thành khi: lead tạo từ AutoHub xuất hiện đúng; đổi status lưu DB và còn đúng sau reload; dữ liệu khách chỉ xuất hiện trong khu vực có quyền.

- [x] **T24 — API thống kê dashboard**
  - Phụ thuộc: T19, T22.
  - Làm: `GET /api/admin/stats` cho số xe theo trạng thái, số lead theo trạng thái và số lượt đăng ký lái thử theo ngày trong 7 ngày gần nhất. Ghi rõ múi giờ và định nghĩa chỉ số; không gọi đây là doanh thu.
  - Hoàn thành khi: fixture DB cho kết quả đúng kể cả ngày không có dữ liệu; API yêu cầu admin; kiểm tra ranh giới ngày và khoảng thời gian.

- [x] **T25 — Dashboard admin**
  - Phụ thuộc: T18, T24.
  - Làm: trang `/projects/admin` với stat card, biểu đồ lái thử 7 ngày và liên kết bảng xe/lead. Số liệu lấy từ API.
  - Hoàn thành khi: tạo lead hoặc đổi trạng thái xe thì dashboard cập nhật sau invalidate/refetch; có loading/error/empty; biểu đồ có nhãn và cách đọc số liệu bằng văn bản.

### Memory Match

- [x] **T26 — Logic game thuần và test**
  - Phụ thuộc: T01.
  - Làm: module TypeScript thuần tại backend cho tạo 6/8/12 cặp, xáo bài, lật thẻ, ghép cặp, đếm lượt và kết thúc. Injectable random/clock cho test. Quy ước: hai lần lật hợp lệ tạo một lượt; lật lại thẻ đang mở/đã ghép không tăng lượt.
  - Hoàn thành khi: test mỗi mặt có đúng 2 thẻ, match/mismatch, duplicate flip, đã ghép, hoàn thành và thời gian đạt; luật game được ghi trong hợp đồng.

- [x] **T27 — API phiên chơi và lật thẻ**
  - Phụ thuộc: T05, T26.
  - Làm: `POST /api/games/memory/sessions`, `GET /api/games/memory/sessions/:id`, `POST /api/games/memory/sessions/:id/flips`; session token ngẫu nhiên truyền qua header `X-Game-Token`, hạn dùng, state lưu DB. Client giữ token trong sessionStorage và dùng GET để khôi phục sau reload. Giữ deck ở server; response chỉ có ID, mặt đang được phép thấy, số lượt và trạng thái. Dùng transaction/row lock hoặc version để chống update đồng thời.
  - Hoàn thành khi: chơi đủ một game bằng API được; deck chưa lật không lộ trong response; token sai/hết hạn bị từ chối; request đồng thời không làm tăng sai lượt hoặc ghép sai. Client không được gửi score/time/deck để ghi đè state.

- [x] **T28 — Giao diện chơi game**
  - Phụ thuộc: T07, T27.
  - Làm: chọn độ khó, bàn thẻ responsive, thời gian hiển thị, số lượt, animation lật/ẩn cặp sai và chơi lại. Disable input trong lúc xử lý lượt/animation; thời gian hiển thị chỉ là UX, kết quả do server quyết định.
  - Hoàn thành khi: match giữ mở, mismatch ẩn lại, không lật thẻ thứ 3 sai luật; thẻ là button dùng bàn phím được; mất mạng có retry/khôi phục phiên; chơi lại tạo session mới.

- [x] **T29 — API ghi kết quả và leaderboard**
  - Phụ thuộc: T27.
  - Làm: endpoint submit nickname cho session đã hoàn thành và GET leaderboard theo difficulty, phân trang. Điểm/lượt/thời gian lấy từ session backend; một session chỉ ghi một kết quả; giới hạn nickname và tần suất.
  - Hoàn thành khi: chưa hoàn thành không ghi được; client gửi score/time giả bị từ chối hoặc bỏ qua; submit lặp không tạo bản ghi trùng; thứ tự lượt/thời gian/createdAt đúng và không trộn độ khó.

- [x] **T30 — Màn chiến thắng và bảng xếp hạng**
  - Phụ thuộc: T28, T29.
  - Làm: kết quả cuối do API trả, form nickname, gửi kết quả, leaderboard theo độ khó, chơi lại. Hiển thị nickname bằng text; không render HTML do người chơi nhập.
  - Hoàn thành khi: kết quả còn trong DB sau reload; nickname được escape; có loading/error/empty; gửi lại không nhân đôi bản ghi; lọc leaderboard đúng độ khó.

### Hoàn thiện và bàn giao

- [x] **T31 — Kiểm tra các luồng tích hợp chính**
  - Phụ thuộc: T09, T15, T16, T21, T23, T25, T30.
  - Làm: Playwright/Supertest với DB test riêng cho: portfolio → chi tiết xe → tạo lead → admin xem/cập nhật; admin sửa/archived xe → AutoHub phản ánh; hoàn thành game → leaderboard; khách bị chặn API admin. Dùng clock/random kiểm soát được trong test game, không mở endpoint tiết lộ deck trong production.
  - Hoàn thành khi: các luồng chạy và đạt từ DB fixture mới; báo đúng số test pass/fail/skip; build FE/API, typecheck FE/API đạt; kết quả chỉ thuộc project-codex và không sử dụng app/database của project khác.

- [x] **T32 — Responsive, accessibility và lỗi thực tế**
  - Phụ thuộc: T31.
  - Làm: kiểm tra 360/768/1440px, focus, label, contrast, reduced motion, lỗi API, phiên admin hết hạn và tải lại URL trực tiếp. Sửa vấn đề trong phạm vi ba demo.
  - Hoàn thành khi: các route chính không tràn ngang; form và game dùng bàn phím được; UI cho retry phù hợp; test cần thiết sau sửa đạt. Ghi rõ kiểm tra thủ công và tự động nào đã chạy.

- [x] **T33 — Tài liệu chạy và cấu hình môi trường tái sử dụng**
  - Phụ thuộc: T31, T32.
  - Làm: README cho web/API, `.env.example` chỉ có giá trị không bí mật, hướng dẫn migration/seed/bootstrap admin, script khởi động và health check. Hướng dẫn build React và SPA fallback. Nếu tiếp tục dùng cloud environment hiện tại, bổ sung hướng dẫn project-codex vào `install_script`/`start_skill` qua kỹ năng onboarding, giữ cấu hình hiện có của các project khác và không chạy lệnh của chúng để kiểm tra project này; không tự publish.
  - Hoàn thành khi: người mới có thể làm theo hướng dẫn và mở được ba URL; migration/seed tái chạy an toàn; startup kiểm tra HTTP/API thật; không có secret trong Git; ghi rõ kết quả hiện tại và các thao tác deploy chưa được thực hiện.

## 5. Mốc nghiệm thu

| Mốc | Task cần xong | Kết quả nhìn thấy |
| --- | --- | --- |
| M1 | T01–T09 | Portfolio có ba card, React và API kết nối thật |
| M2 | T10–T16 | Tìm xe, xem chi tiết, so sánh và gửi yêu cầu |
| M3 | T17–T25 | Admin quản lý dữ liệu AutoHub và xem thống kê |
| M4 | T26–T30 | Game có luật, phiên chơi, kết quả và leaderboard thật |
| M5 | T31–T33 | Kiểm tra tích hợp, giao diện và hướng dẫn tái chạy hoàn chỉnh |

Thứ tự mặc định: T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09 → T10 … T33. Các phụ thuộc cụ thể ở mỗi task cho phép đổi thứ tự khi hợp lý; ví dụ T07 không cần database, T26 có thể làm khi phần DB đang bị chặn. Đây không phải yêu cầu chạy nhiều agent.

## 6. Nhật ký task

Hiện tại (2026-10-06): đã triển khai portfolio và ba demo, FE/API/PostgreSQL chạy thật. Nghiệm thu cuối: 23 API + 3 web + 10 E2E đạt, 0 fail/skip; lint/typecheck/build/format và compiled startup đạt. Setup/start tái chạy an toàn, cloud draft đã lưu; mã nguồn đã lên GitHub main, chưa publish snapshot môi trường hoặc deploy ứng dụng. Chi tiết file và kiểm tra: docs/verification.md.

Mẫu thêm bản ghi sau mỗi lượt:

```text
Task: Txx
Trạng thái: hoàn thành / đang làm / bị chặn
File thay đổi:
Kiểm tra đã chạy và kết quả:
Tiêu chí còn thiếu:
Task tiếp theo có đủ phụ thuộc:
```

- T01 — hoàn thành: Đã kiểm tra Node 24/npm11; docs architecture và API contract; SELECT current_database(),1 đạt cho 2 database riêng.

- T02 — hoàn thành: Vite/React/TS/Tailwind build và typecheck đạt; router khai báo 3 URL và fallback 404.

- T03 — hoàn thành: API build và health test đạt; server chạy từ dist; HTTP health qua Vite proxy trả status ok.

- T04 — hoàn thành: database.test: migration tái chạy an toàn và SQL lỗi rollback, bảng lỗi không tồn tại.

- T05 — hoàn thành: database.test: PostgreSQL từ chối giá âm, slug trùng và FK không tồn tại; schema gồm unique kết quả/game session.

- T06 — hoàn thành: Seed chạy hai lần; database.test xác nhận đủ 3 project, 12 xe, không nhân đôi và giữ bản ghi đã sửa; ảnh SVG nguyên bản.

- T07 — hoàn thành: UI tests: modal focus/Escape và pagination đạt.

- T08 — hoàn thành: public.test: 3 project slug/URL lấy từ PostgreSQL đạt.

- T09 — hoàn thành: Chromium: portfolio và điều hướng AutoHub đạt; lỗi Vite dev đã sửa bằng thống nhất Vite8.

- T10 — hoàn thành: public.test: filter, sort, pagination validation, empty/archived visibility đạt.

- T11 — hoàn thành: Chromium: filter Toyota và reload giữ query URL đạt.

- T12 — hoàn thành: public.test: detail numeric price, by-ids, missing/archived 404 đạt.

- T13 — hoàn thành: Chromium: detail URL và gallery controls đạt.

- T16 — hoàn thành: Chromium: limit3 compare, URL 3 card đúng và favorite giữ sau reload đạt.

- T14 — hoàn thành: leads.test: validation/date lỗi theo field, retry idempotent, payload khác409 và public không đọc được leads đạt.

- T17 — hoàn thành: admin.test: hash/cookie HttpOnly, login lỗi, CSRF/origin403, logout/expired session401 và session rotation đạt.

- T19 — hoàn thành: admin.test: create/update/archive, stale version409, public 404 sau archive và giữ lead đạt.

- T22 — hoàn thành: admin.test: lead filter/detail/status, stale409 và giữ thông tin liên hệ đạt.

- T24 — hoàn thành: admin.test: 7 bucket có zero, timezone UTC+7 và fixture23:30UTC đếm ngày kế tiếp đạt.

- T26 — hoàn thành: game.test: 3 độ khó, đúng2 thẻ/mặt, match/mismatch, stale/duplicate, cooldown, finished và clock server đạt.

- T15 — hoàn thành: commerce E2E: form lái thử ghi DB, hiển thị thành công và admin đọc được cùng lead đạt.

- T18 — hoàn thành: commerce E2E: login/route guard, session sau reload và logout revokes access đạt.

- T20 — hoàn thành: commerce E2E: bảng xe search, sửa/archive và AutoHub phản ánh đạt.

- T21 — hoàn thành: commerce E2E: form create/update ghi giá chính xác vào PostgreSQL và hiển thị public đạt.

- T23 — hoàn thành: commerce E2E: tìm lead, xem chi tiết và đổi trạng thái lưu DB/hiển thị đúng đạt.

- T25 — hoàn thành: commerce E2E: dashboard dữ liệu từ stats API hiển thị sau login/reload; charts có bản text.

- T27 — hoàn thành: game-api.test: hidden deck, token403, expiry410 và đồng thời version-lock một200/một409 đạt.

- T28 — hoàn thành: Game E2E: chơi keyboard, ghép đủ cặp, reload khôi phục state và đổi hard tạo24 thẻ đạt.

- T29 — hoàn thành: game-api.test: incomplete409, forged payload400, complete từ state server, submit repeat1 row và difficulty separation đạt.

- T30 — hoàn thành: Game E2E: nickname dạng HTML hiển thị text, thành tích lưuDB/leaderboard và giữ sau reload đạt.

- T31 — hoàn thành: apps/api/test, apps/web/src/**/*.test.*, tests/e2e: npm run lint, npm run typecheck, npm run build, npm test đạt (22 API + 3 web); npm run test:e2e đạt 10/10, 0 fail/skip. Luồng portfolio→xe→lead→admin, CRUD/archive, filter/favorite/compare, game→leaderboard và 401 chạy với project_codex_test.

- T32 — hoàn thành: styles.css, ui.tsx, tests/e2e/usability.spec.ts và commerce/game: Playwright 360/768/1440 + axe WCAG2A/AA/2.1AA không violation trên 7 route chính; modal keyboard/focus/Escape, game Enter/cooldown, reduced motion, API503 retry, reload URL, 404 và session DB hết hạn đạt. Đã sửa contrast và accessible select label; test E2E cuối 10/10. Không thay test để bỏ assertion.

- T33 — hoàn thành: README root/web/API, .env.example, scripts/setup.sh/init-config/local-db/services/smoke/verify-build và docs: npm run setup/npm ci, lifecycle stop DB+apps→start→start lại, HTTP/DB/browser3 demo/reload đạt; npm run check cuối 23 API+3 web+10 E2E, 0 fail/skip; compiled SPA404/cookie production proxy test và format đạt. Secret scan114 file đạt sau bỏ HTML auth report. Cloud install_script/start_skill đã saved, requires_publish=true; legacy settings giữ nguyên, chưa publish/deploy/commit/push/remote. Không còn blocker.

- T14 — hoàn thành: Rà soát nghiệm thu bổ sung: leads route transaction/advisory key+row lock và leads.test.ts; test3/3 đạt cho concurrent retry, archive và ngày hẹn đã qua; bộ cuốiAPI23/23. Không thay dữ liệu dev.

- T31 — hoàn thành: Nghiệm thu cuối cập nhật sau sửa retry: npm run check đạt lint/typecheck/build, API23+web3 và E2E10/10, compiled API/React SPA/cookie Secure proxy; reporter console chạy lạiE2E10/10. Bằng chứng đầy đủ docs/verification.md.

- GitHub (2026-10-06) — theo yêu cầu riêng của người dùng: chuẩn bị toàn bộ source/tài liệu, kiểm tra 91 file không chứa secret/local database/dependency/build output. `gh api user` xác nhận hoamiz; repository project-codex chưa tồn tại. `gh repo create` bị GraphQL từ chối; REST POST user/repos trả403 Resource not accessible by integration. Đã commit toàn bộ main cục bộ, root commit18b7730; origin cấu hình tới https://github.com/hoamiz/project-codex.git. Chưa push vì quyền tạo repository bên ngoài bị chặn.

- GitHub (2026-10-06) — hoàn thành sau khi quyền truy cập thay đổi: repository đã tồn tại và API có quyền push. Git HTTPS thiếu xác thực/401; API GitHub ghi dữ liệu thành công. Khởi tạo bằng README thật, merge bảo toàn cả lịch sử cục bộ và remote; upload tree/commit qua Git Data API và cập nhật main không force. 91 file, tree SHA và commit SHA khớp cục bộ; source, lockfile, migration, test, ảnh và tài liệu đã được đưa lên; không có .env/local DB/dependencies/build artifact.

## Cập nhật UI AutoHub theo Carmudi — 2026-10-07

- [x] **UI01 — Khảo sát tham chiếu:** đọc HTML/CSS công khai của Carmudi; đối chiếu danh sách/bộ lọc/thẻ xe với hợp đồng API và luồng AutoHub hiện có.
- [x] **UI02 — Triển khai giao diện:** theme xanh/cam được giới hạn trong AutoHub; header/footer riêng, banner, lựa chọn hãng, sidebar lọc và panel mobile, bộ lọc đang dùng/xóa lọc, thẻ xe, hướng dẫn mua xe; đồng bộ chi tiết/so sánh. Dùng ảnh SVG nguyên bản, dữ liệu API hiện có. Comment tiếng Việt giải thích storage, giới hạn so sánh, reset filter và cuộn hash sau khi tải dữ liệu.
- [x] **UI03 — Nghiệm thu:** lint, TypeScript/build FE, 3 web test, 12 E2E, format và compiled API/SPA đạt. Axe tại 360/768/1440px gồm danh sách, chi tiết, so sánh; panel lọc mobile mở được bằng bàn phím, không tràn ngang. Kết quả và file trong [docs/verification.md](docs/verification.md).

Nhật ký: thay đổi `apps/web/src/main.tsx`, `features/autohub.tsx`, thêm `features/autohub-layout.tsx`/`autohub.css`, thêm `tests/e2e/autohub.spec.ts`, mở rộng `usability.spec.ts` và cập nhật README/nhật ký. Lần E2E đầu đạt 11/12, phát hiện cuộn tới hướng dẫn trước khi API hoàn thành khiến mục bị đẩy khỏi viewport; chuyển xử lý hash vào AutoHub và chờ cả danh sách/hãng tải xong. Chạy lại đạt 12/12, không bỏ test/assertion. Backend, schema và dependency không đổi. Nghiệm thu UI hoàn tất cục bộ trước khi người dùng yêu cầu cập nhật GitHub.

## PJ4 — Room Studio 3D (2026-10-07)

Phạm vi/hợp đồng và tiêu chí chi tiết: [docs/room-studio-plan.md](docs/room-studio-plan.md). Thực hiện R01–R07 theo phụ thuộc; ghi kết quả kiểm tra trước khi đánh dấu.

- [x] R01 — Công cụ 3D và hợp đồng layout.
- [x] R02 — Migration, catalog/API snapshot và test PostgreSQL.
- [x] R03 — Phòng 3D, sáu model, camera/ánh sáng và fallback 2D.
- [x] R04 — Editor, placement, history và lưu nháp.
- [x] R05 — Lưu/chia sẻ, trang chỉ đọc và tạo bản sao.
- [x] R06 — Project thứ tư trên portfolio, route lazy và smoke.
- [x] R07 — Nghiệm thu, tài liệu và startup cloud.

Nhật ký R01 đang thực hiện: đã kiểm tra working tree sạch, đọc cấu trúc app/schema/test; WebGL2 hoạt động trong Chromium mặc định. Dịch vụ/DB riêng khởi động và smoke ba demo cũ đạt. Cache npm mặc định nằm ngoài vùng ghi; chuyển cache sang `.local/npm-cache` trong project để cài dependency.

R01 hoàn thành: Three0.186.1, React Three Fiber9.8.1, Drei10.7.9 và @types/three0.186 được cài trong workspace web, lockfile chung cập nhật; không cần đổi React19. Chromium WebGL2 thực hoạt động (mặc định và SwiftShader), max texture8192. Hợp đồng tại docs/room-studio-plan.md.

R02 hoàn thành: migration002 mở whitelist URL và thêm room_designs, seed thêm PJ4; services/room.ts và routes/rooms.ts validate layout/catalog, snapshot immutable, key/hash và transaction lock. API typecheck đạt; `npm run test -w @project-codex/api -- --run test/rooms.test.ts test/public.test.ts test/database.test.ts`: 9/9 đạt. Dev migration/seed đạt, test kiểm tra tái chạy/rollback và giữ dữ liệu đã sửa; lưu/đọc DB thật, collision/bounds/duplicate/unknown kind/color/limit/snap, retry đồng thời201/200, conflict409, readonly/404 và Origin403. R03 tiếp tục.

R03 hoàn thành: `features/room-studio/room-models.tsx`, `room-scene.tsx` dựng hình học nguyên bản, camera orthographic/OrbitControls, ngày/đêm và sơ đồ 2D. Web typecheck đạt. Chromium render WebGL thật không pageerror; đã xem screenshot desktop. E2E kéo bed bằng chuột, xoay camera làm ảnh PNG thay đổi, tải ảnh PNG hợp lệ và thiếu WebGL chuyển sang 2D đạt. Dùng PCFShadowMap hỗ trợ bởi Three hiện tại.

R04 hoàn thành: editor/controller, `room-core.ts` và CSS responsive; 5/5 unit test (placement/collision/grid/bounds/limit, history/no-op/redo, draft validation/recovery, challenge). E2E undo một lần kéo, reject giữ draft, màu/ngày đêm/reload, reset xác nhận, keyboard xoay/dịch/xóa/undo/redo và challenge đạt. Comment tiếng Việt giải thích drag raycast/capture, validation, history, copy và key retry.

R05 hoàn thành: `tests/e2e/room-studio.spec.ts` đạt 7/7, 0 skip; mất phản hồi sau khi server đã ghi rồi retry cùng key vẫn một row DB, URL/reload chỉ đọc, copy rồi sửa/reload không thay snapshot. API/catalog lỗi và storage bị chặn có đường retry/chỉnh tiếp; snapshot lỗi404 rõ ràng. Axe editor/panel/help/share tại360/768/1440 không violation, không tràn ngang. Lần đầu phát hiện nested-interactive do Canvas mang role img; sửa role group, giữ nguyên assertion và chạy lại đạt. Log `.local/logs/room-e2e.log`.

R06 hoàn thành: portfolio4 card lấy từ API, minh họa SVG nguyên bản, route editor/view lazy và smoke4 demo/reload. `npm run check` đạt lint/typecheck/build, API26 + web8 và E2E19/19; compiled server/SPA/cookie/missing asset đạt. Manifest + request browser xác nhận bundle studio không tải trên portfolio, tải khi mở studio; các luồng ba demo cũ vẫn đạt. Log `.local/logs/room-check-final.log`.

R07 hoàn thành: README root/web/API, kiến trúc, API contract và docs/verification.md đã cập nhật; format và git diff check đạt. Frozen-lockfile setup cài492 package, giữ fingerprint `.env` và số row dev4 project/12 xe/0 snapshot; owned stop/start + smoke4 demo đạt. Đã xem screenshot desktop/mobile và portfolio4 card; secret scan108 source/tài liệu đạt, local config/artifact bị Git bỏ qua. Cloud start_skill saved, requires_publish=true; đọc lại xác nhận nội dung đúng và install_script/repositories/network/secrets/runtime requirements giữ nguyên, legacy suffix giữ nguyên. Review/Save→Publish là thao tác lưu snapshot trong settings khi người dùng muốn, chưa publish/deploy/commit/push PJ4; chưa kiểm chứng restore task mới. Không còn blocker triển khai.

GitHub PJ4 — hoàn thành theo yêu cầu riêng2026-10-07: commit tính năng `14886e2` đã lên `main` của hoamiz/project-codex; tree108 file/commitSHA đối chiếu đúng qua API và fetch. Ref cập nhật không force, bảo toàn lịch sử AutoHub; source/migration/test/lockfile/docs đầy đủ, không có local config/secret/data/build. Format và staged secret scan đạt; bằng chứng26 API + 8 web + 19 E2E giữ nguyên. Không deploy/publish môi trường trong bước GitHub.

## Sửa card Room Studio bị thiếu — 2026-10-07

- [x] C01 — Tái hiện DB cũ: server không seed trên DB đã migrate001/002 có3 metadata trả thiếu room-studio; test trước sửa thất bại đúng tại danh sách slug. DB môi trường hiện tại có4 metadata, chưa có URL của môi trường người dùng để đối chiếu trực tiếp.
- [x] C02 — Bổ sung migration003 đăng ký metadata, startup migrate trước listen; giữ migration cũ và dữ liệu đã chỉnh. Hai test server thật trong schema test riêng và public/database test đạt8/8; không chạy seed trong fixture nâng cấp.
- [x] C03 — Nghiệm thu card→room và hồi quy startup/build: `npm run check` đạt28 API + 8 web + 19 E2E, lint/typecheck/build/compiled SPA đạt; format và diff check đạt. Browser thực trên dev hiển thị4 card, nhấn Room Studio mở editor; screenshot `.local/reference/room-card-fixed.png`. Bản sửa `cea8b8d` đã lên main của hoamiz/project-codex; tree/commit đối chiếu đúng, không force và không có artifact/secret.
