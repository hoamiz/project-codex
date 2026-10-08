# PJ5 — Brick Playground 3D

Hợp đồng và task ngày2026-10-08. PJ5 đã được triển khai trong project-codex; trạng thái từng task và kiểm tra nằm ở checklist duy nhất trong mục PJ5 của [PORTFOLIO_TASKS.md](../PORTFOLIO_TASKS.md), kết quả cuối ở [docs/verification.md](verification.md). Prompt thực hiện/tiếp tục: [RUN_PJ5_TASKS.md](../RUN_PJ5_TASKS.md). Đọc cùng `AGENTS.md` trước khi sửa.

## 1. Sản phẩm và phạm vi

Một playground lắp gạch 3D: danh mục bên trái, chọn màu rồi click để tạo gạch, kéo để lắp trên chân đế hoặc chồng lên gạch khác, kéo vào giỏ rác để bỏ. Có xoay camera/zoom/reset, xoay gạch 90°, đổi màu gạch đã chọn, nhân bản, Undo/Redo, tự lưu nháp, chụp PNG và lưu/chia sẻ công trình qua PostgreSQL.

- Editor: `/projects/brick-playground`.
- Trang xem snapshot: `/projects/brick-playground/view/:id`, ID UUID, chỉ đọc.
- Slug portfolio: `brick-playground`, tên `Brick Playground 3D`, là card thứ năm sau Room Studio.
- Desktop: panel danh mục/màu bên trái, sân 3D ở giữa, toolbar phía trên, giỏ rác góc dưới bên phải, thuộc tính gạch đã chọn trong panel.
- Mobile: panel thu gọn mở bằng nút; giỏ rác và thao tác xóa vẫn tiếp cận được, không tràn ngang. Phân biệt kéo gạch với xoay camera.
- Ban đầu là chân đế trống. Chân đế cố định, không chọn/kéo/xóa và không tính vào giới hạn gạch.

MVP có 10 loại gạch hình hộp, 8 màu, tối đa 150 gạch, chân đế 32 × 32 nút và chiều cao tối đa 48 đơn vị plate. Chỉ mô phỏng lắp theo lưới và điểm tựa; không dùng engine vật lý, khớp cơ khí hay tài nguyên model/CDN bên ngoài. Gạch dốc, bánh xe, ngôi nhà/xe/robot dựng sẵn, multiplayer và tài khoản nằm ngoài B01–B22.

## 2. Hợp đồng gạch và thao tác

### Catalog

| `kind`      | Tên hiển thị | Rộng × sâu, đơn vị nút | Cao, đơn vị plate |
| ----------- | ------------ | ---------------------- | ----------------- |
| `brick-1x1` | Gạch 1 × 1   | 1 × 1                  | 3                 |
| `brick-1x2` | Gạch 1 × 2   | 1 × 2                  | 3                 |
| `brick-1x3` | Gạch 1 × 3   | 1 × 3                  | 3                 |
| `brick-1x4` | Gạch 1 × 4   | 1 × 4                  | 3                 |
| `brick-2x2` | Gạch 2 × 2   | 2 × 2                  | 3                 |
| `brick-2x3` | Gạch 2 × 3   | 2 × 3                  | 3                 |
| `brick-2x4` | Gạch 2 × 4   | 2 × 4                  | 3                 |
| `plate-1x2` | Tấm 1 × 2    | 1 × 2                  | 1                 |
| `plate-2x2` | Tấm 2 × 2    | 2 × 2                  | 1                 |
| `plate-2x4` | Tấm 2 × 4    | 2 × 4                  | 1                 |

Màu catalog: đỏ `#ef4444`, cam `#f97316`, vàng `#facc15`, xanh lá `#22c55e`, xanh dương `#3b82f6`, tím `#a855f7`, trắng `#f8fafc`, đen `#1f2937`. Chuẩn hóa chữ thường; API chỉ nhận màu trong catalog. Mỗi lựa chọn có nhãn, không truyền đạt lựa chọn chỉ bằng màu.

### Layout v1

```ts
type BrickLayout = {
  schemaVersion: 1;
  title: string; // trim, 2–80 ký tự
  bricks: Array<{
    id: string; // UUID, duy nhất trong layout
    kind: string; // thuộc catalog
    color: string; // thuộc catalog
    x: number; // tọa độ nguyên của góc thấp nhất trên trục x
    y: number; // độ cao mặt đáy, đơn vị plate, nguyên >= 0
    z: number; // tọa độ nguyên của góc thấp nhất trên trục z
    rotation: 0 | 90 | 180 | 270;
  }>;
};
```

Đây là minh họa hợp đồng; B02/B04 phải dùng union/enum từ catalog trong code. Kích thước chân đế, chiều cao và kích thước gạch do catalog quyết định, không nhận từ client. Không lưu selection, camera, preview kéo, history hay request key trong layout DB.

### Quy tắc bắt buộc

1. Footprint khi xoay 90°/270° đổi rộng/sâu. Góc thấp nhất `(x,z)` vẫn làm mốc; gạch phải nằm hoàn toàn trong `[0,32) × [0,32)`, `y + height <= 48`.
2. Kiểm tra collision bằng thể tích hộp nửa mở trên tọa độ nguyên. Chạm mặt/mép được phép, xuyên nhau bị từ chối. Nút nổi chỉ là hình ảnh, không cộng vào chiều cao logic.
3. Gạch tại `y=0` được chân đế đỡ. Gạch phía trên cần ít nhất một ô nút thuộc footprint có điểm tựa từ mặt trên gạch khác đúng độ cao đáy. Cho phép phần nhô ra; không tính độ bền hoặc trọng tâm. Mọi chuỗi điểm tựa phải kết thúc ở chân đế.
4. Spawn/nhân bản: tìm footprint trống trên chân đế theo thứ tự z rồi x, rotation 0 cho spawn; nhân bản giữ loại/màu/rotation nhưng ID mới. Không tự xóa gạch để tạo chỗ; đủ 150 gạch hoặc không còn vị trí thì báo rõ, không đổi layout/history.
5. Kéo: loại gạch đang kéo khỏi tập dùng tính điểm đặt, snap `(x,z)`, chọn độ cao trên cùng của các footprint đang giao nhau tại vị trí đó, mặc định 0 khi không có. Validate preview; hợp lệ hiện xanh, sai hiện đỏ kèm lý do. Không lén đổi vị trí khi thả sai.
6. Di chuyển, xoay hoặc xóa có thể làm gạch khác mất điểm tựa. Sau thao tác hợp lệ, dùng **settle rời rạc**: xử lý gạch theo y tăng dần, UUID để phá hòa; giữ x/z/rotation, hạ xuống mặt đỡ cao nhất không vượt y cũ, không xuyên gạch đã xử lý. Không có animation vật lý. Gạch được di chuyển giữ tọa độ candidate trước bước settle. FE phải validate toàn layout sau bước này; API từ chối layout còn lơ lửng thay vì tự sửa payload. Thao tác và mọi thay đổi độ cao là một bước Undo.
7. Thả sai, Escape hoặc `pointercancel` khôi phục layout trước kéo. Selection/camera/preview không tạo history và không ghi nháp. Drag không khóa camera sau khi kết thúc hoặc bị hủy.
8. Giỏ rác là vùng DOM cố định: khi kéo gạch, hit-test bằng tọa độ client và bounding rect của vùng rác, ưu tiên hơn placement. Hover có highlight và nhãn; thả trong vùng xóa đúng gạch rồi settle. Kéo ngang qua vùng mà không thả không xóa.
9. Undo/Redo tối đa 50 trạng thái; một lần kéo chỉ là một command. Thao tác mới sau Undo xóa nhánh Redo, no-op không thêm history. Clear cần xác nhận và có thể Undo.
10. Nháp có key riêng `project-codex:brick-playground:v1`; validate dữ liệu trước phục hồi. JSON hỏng, version lạ, storage bị chặn/quota không làm app crash. Không tự ghi đè nháp editor khi mở trang chỉ đọc.

## 3. FE, API và database

Dùng dependency Three.js/React Three Fiber/Drei đang có, không nâng phiên bản chỉ để làm PJ5. Dựng hình hộp bo nhẹ và các nút hình trụ bằng geometry nguyên bản; tái sử dụng geometry/material và instancing nút chân đế. Lazy-load renderer để portfolio/AutoHub/game/admin không tải Three.js vì PJ5. Có trạng thái loading/error và phục hồi khi mất WebGL.

File dự kiến, chỉ tạo khi task cần:

```text
apps/web/src/features/brick-playground/
  index.tsx                    # shell/editor và trang xem
  brick-core.ts                # footprint/placement/settle/history/draft
  brick-core.test.ts            # quy tắc và fixture phản ví dụ
  brick-models.tsx              # geometry gạch và chân đế
  brick-scene.tsx               # camera/raycast/preview/WebGL
  brick-playground.css          # style giới hạn trong PJ5
apps/api/src/services/bricks.ts # catalog, schema/validation và lưu snapshot
apps/api/src/routes/bricks.ts   # public API
apps/api/test/bricks.test.ts
apps/api/db/migrations/004_brick_playground.sql
apps/web/public/images/brick-playground.svg
tests/e2e/brick-playground.spec.ts
```

Tên migration 004 chỉ dùng nếu vẫn là số kế tiếp tại lúc triển khai. Thêm migration mới, giữ nguyên checksum 001–003. Mở whitelist URL portfolio để thêm route mới và giữ cả bốn route cũ; thêm metadata bằng `ON CONFLICT (slug) DO NOTHING` ngay trong migration, không phụ thuộc seed khi nâng cấp DB cũ. Seed vẫn thêm đủ năm demo mà không ghi đè metadata đã chỉnh.

`brick_designs`: UUID primary key, `title varchar(80)`, `layout JSONB` v1, `idempotency_key UUID UNIQUE`, `payload_hash` SHA-256 hex, `created_at timestamptz`. CHECK cho title/schema/array; API chịu trách nhiệm validation đầy đủ. Snapshot chỉ ghi mới, không có public update/delete/list endpoint.

| API                           | Thành công                                                                                           | Lỗi và yêu cầu                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `GET /api/bricks/catalog`     | 200 `{data:{schemaVersion:1,baseplate:{width:32,depth:32,maxHeight:48,maxBricks:150},kinds,colors}}` | Là nguồn catalog cho FE và API validation                                                        |
| `POST /api/bricks/designs`    | Body `{layout}`, header `Idempotency-Key` UUID; 201 bản mới, 200 retry cùng key và payload chuẩn hóa | 400 sai schema/placement/key, 403 origin sai, 409 key đã dùng với payload khác, 429 quá tần suất |
| `GET /api/bricks/designs/:id` | 200 `{data:{id,title,layout,createdAt}}`                                                             | 400 ID sai, 404 không có, lỗi DB có kiểm soát                                                    |

POST trả cùng cấu trúc tài nguyên với GET; lỗi dùng `{error:{code,message,fields?}}`. Giới hạn 30 POST/15 phút/IP theo pattern Room Studio; dùng body limit hiện có và test quá giới hạn. SQL tham số, transaction/advisory lock theo key để retry đồng thời chỉ có một row. Hash từ layout đã normalize và sắp xếp bricks theo UUID; đổi thứ tự mảng không đổi nghĩa. Backend tự validate toàn layout, không tin `valid` hoặc kích thước client gửi.

UI lưu giữ nguyên snapshot payload/key khi retry sau mất phản hồi. Nếu tiếp tục chỉnh, một lần lưu mới có payload/key mới. Có thông báo snapshot công khai trước lưu; tiêu đề render như text. Trang xem không có thao tác sửa/lưu, nhưng có **Tạo bản sao** với xác nhận nếu nháp hiện tại có thay đổi.

Không có WebGL: hiển thị sơ đồ trên xuống, danh sách gạch cùng độ cao, chọn theo danh sách và chỉnh x/y/z/rotation/màu qua form, thêm/xóa/Undo/lưu bằng cùng core. Fallback không cần giả lập drag 3D hoặc PNG; thông báo rõ chức năng PNG cần renderer 3D.

## 4. Task theo thứ tự B01–B22

Mỗi task bên dưới là một đơn vị triển khai/kiểm tra. Chỉ đổi checkbox trong `PORTFOLIO_TASKS.md` sau khi tiêu chí đạt và ghi kết quả thực chạy. Tài liệu hiện tại không chứng minh task triển khai đã hoàn thành. Lệnh test file ghi dưới đây là **lệnh dự kiến sau khi file được tạo**, không phải báo cáo test đã chạy.

### B01 — Kiểm kê và chốt hợp đồng

- Phụ thuộc: không.
- Làm: đọc AGENTS/checklist/README và Git status; kiểm tra route, catalog Room Studio, migration/schema, test isolation, React/Three và WebGL Chromium. Ghi các quyết định PJ5 còn cần làm rõ vào tài liệu này, giữ các quy tắc đã chốt.
- Hoàn thành khi: xác nhận số migration kế tiếp, URL không xung đột, dependency hiện có đủ dùng, baseline của bốn demo và DB riêng truy cập được. Nếu DB là blocker thật, ghi riêng; B02/B03/renderer có thể làm độc lập.
- Kiểm tra: baseline typecheck và smoke bốn demo bằng scripts hiện có; ghi kết quả thực, không tính file kế hoạch là bằng chứng sản phẩm.

### B02 — Catalog, kiểu dữ liệu và fixture

- Phụ thuộc: B01.
- Làm: catalog 10 loại/8 màu/giới hạn, kiểu layout v1, fixture hợp lệ và phản ví dụ. FE nhận catalog API; fixture chỉ dùng phát triển trước API/test, bỏ đường mock runtime khi B09 hoàn tất. FE/API cùng dùng bộ trường và tọa độ đã chốt, có fixture đối chiếu để tránh lệch quy tắc.
- Hoàn thành khi: kích thước plate/brick, rotation và màu đúng bảng; fixture có gạch trên đế, chồng, cầu nhô, xoay, collision, ngoài đế và lơ lửng.
- Kiểm tra: typecheck workspace bị sửa; kiểm tra catalog/fixture thật bằng unit test quy tắc ở B03/B04, không thêm test chỉ đếm hằng số.

### B03 — Core placement và settle

- Phụ thuộc: B02.
- Làm: pure functions footprint, bounds, collision 3D, điểm tựa, tìm vị trí spawn/độ cao kéo, settle rời rạc. Không phụ thuộc Canvas/DOM; không mutate input. JSDoc tiếng Việt cho các quy tắc khó suy ra.
- Hoàn thành khi: 0/90/180/270, tiếp xúc hợp lệ, không xuyên/lơ lửng/ra đế, giới hạn cao/số lượng, phép hạ sau bỏ chân đỡ và kết quả ổn định khi đổi thứ tự input đều đúng.
- Kiểm tra: `npm run test -w @project-codex/web -- --run src/features/brick-playground/brick-core.test.ts`; cover bridge còn điểm tựa, tháp mất điểm tựa, nhiều tầng, y=48 và spawn không còn chỗ. Test kết quả hình học và tính bất biến, không mirror từng dòng implementation.

### B04 — Validation phía server

- Phụ thuộc: B02, B03.
- Làm: schema strict bằng Zod, normalize màu/title/thứ tự, kiểm tra ID trùng, catalog, số nguyên/rotation/giới hạn, bounds/collision/điểm tựa. Trả field error gắn với gạch sai. Không tự settle payload bất hợp lệ tại API.
- Hoàn thành khi: payload giả kích thước, field thừa, NaN/float, gạch không có điểm tựa, collision và vượt giới hạn bị từ chối; API/FE cho cùng kết quả trên fixture hợp đồng.
- Kiểm tra: API validation tests trong `test/bricks.test.ts`, web core fixtures, typecheck API. Title có HTML vẫn chỉ là text.

### B05 — Migration, snapshot table và metadata nâng cấp

- Phụ thuộc: B01, B04.
- Làm: migration mới mở whitelist, tạo `brick_designs`, đăng ký metadata PJ5; bổ sung seed năm project. Giữ bảng/migration/dữ liệu Room Studio và ba demo ban đầu.
- Hoàn thành khi: DB mới và DB đã áp dụng001–003 đều migrate được; migrate/seed lại không nhân đôi hoặc ghi đè metadata đã sửa; không cần seed để DB cũ có card thứ năm.
- Kiểm tra: DB test/fixture schema riêng; unique key, title/schema CHECK, SQL rollback, lịch sử/checksum; cập nhật assertion portfolio năm slug khi dữ liệu test đã có PJ5. Không reset DB dev.

### B06 — API catalog

- Phụ thuộc: B02, B04.
- Làm: router bricks, nối Express app, `GET /api/bricks/catalog` theo hợp đồng; dùng cùng catalog server validation.
- Hoàn thành khi: response đúng kiểu, đủ loại/màu/giới hạn, không xung đột route khác, lỗi unknown API vẫn 404 JSON.
- Kiểm tra: Supertest catalog/route/response, API typecheck; FE chưa cần renderer để gọi endpoint.

### B07 — Service lưu/đọc snapshot PostgreSQL

- Phụ thuộc: B04, B05.
- Làm: query có tham số, hash canonical, transaction/key lock, ghi mới và đọc UUID; release client/rollback khi lỗi. Dùng pattern hiện có nhưng tách tài nguyên PJ5.
- Hoàn thành khi: retry cùng payload/key cùng ID; hai request đồng thời chỉ một row; đổi thứ tự bricks vẫn retry được; key cũ với dữ liệu khác conflict và không đổi snapshot.
- Kiểm tra: service/integration với `project_codex_test`, concurrent retry và failure rollback; kiểm tra bản ghi DB thật, không mock pool thay cho tích hợp.

### B08 — API lưu/đọc, origin và giới hạn request

- Phụ thuộc: B06, B07.
- Làm: POST/GET designs, status201/200/400/403/404/409/429, origin check, body/rate limit và lỗi được sanitize; không mở update/delete snapshot.
- Hoàn thành khi: validate trước ghi, public đọc snapshot, lỗi DB không lộ stack/credential; giới hạn tần suất không ảnh hưởng auth/game/rooms.
- Kiểm tra: `npm run test -w @project-codex/api -- --run test/bricks.test.ts`; valid/invalid ID, thiếu/sai key, origin, payload lớn, immutable và retry/conflict DB thật.

### B09 — Shell editor, route và tải catalog thật

- Phụ thuộc: B06.
- Làm: route editor lazy, layout/panel danh mục 10 loại, màu có label, toolbar/trash placeholder chức năng sẽ nối B11–B15; loading/error/retry catalog; CSS giới hạn trong PJ5.
- Hoàn thành khi: URL trực tiếp mở shell; catalog từ API thật, click retry phục hồi; có đường về portfolio; không hiển thị thành công khi dữ liệu đang mock.
- Kiểm tra: web typecheck/build, browser direct URL và API503→retry. Shell xong không được coi là editor xong.

### B10 — Chân đế, model gạch và camera 3D

- Phụ thuộc: B02, B09.
- Làm: base32×32 luôn có, 10 model/các nút và vật liệu màu; camera orbit/zoom/reset, ánh sáng/đổ bóng; reuse geometry/instancing, dispose tài nguyên. Renderer tải theo route; khi WebGL lỗi có UI thay thế trước B18.
- Hoàn thành khi: model đúng footprint/chiều cao, đủ tám màu nhìn rõ, chân đế không chọn/xóa; 150 gạch fixture vẫn tương tác được. Không tải model/font bên ngoài.
- Kiểm tra: Chromium WebGL thật, ảnh desktop để xem bố cục/geometry; camera thao tác đúng, không pageerror và resource leak qua nhiều lần vào/ra route; typecheck/build.

### B11 — Chọn màu, spawn và selection

- Phụ thuộc: B03, B09, B10.
- Làm: màu áp dụng cho spawn tiếp theo; click catalog tạo một gạch tại chỗ trống, ID mới, tự chọn; click gạch/danh sách chọn và highlight. Đổi màu catalog không tự đổi các gạch đã tồn tại.
- Hoàn thành khi: đủ 10 loại spawn đúng màu/kích thước; chọn/clear selection đúng, base không chọn; hết vị trí/150 gạch báo rõ, layout không đổi.
- Kiểm tra: browser click màu/catalog và quan sát layout/model; test giới hạn/no mutation tại core, không chỉ kiểm tra button có mặt.

### B12 — Kéo thả, snap, chồng gạch và hủy kéo

- Phụ thuộc: B03, B11.
- Làm: pointer capture/raycast/ghost preview, điểm đặt trên đế hoặc mặt gạch, khóa camera trong drag, commit layout+settle khi thả hợp lệ; Escape/pointercancel trả layout trước đó.
- Hoàn thành khi: kéo bằng chuột/touch, stack đúng y, preview đỏ và giữ nguyên khi outside/collision/quá cao; không xuyên gạch; sau kéo/hủy camera dùng lại được.
- Kiểm tra: browser drag bằng pointer thật và assert tọa độ/height, invalid drop/cancel; kiểm tra gạch mất chân đỡ settle đúng. Không dùng test gọi thẳng store để thay kiểm tra kéo.

### B13 — Giỏ rác và xóa

- Phụ thuộc: B12.
- Làm: hit-test DOM với client coordinates, hover highlight, drop delete, nút xóa tương đương; settle gạch còn lại. Không cho xóa chân đế.
- Hoàn thành khi: thả trong rác xóa đúng một gạch được chọn, gạch phía trên hạ nếu cần; thả sát ngoài rác không xóa; kéo qua rồi hủy không xóa. Vị trí rác đúng cả sau resize/scroll/mở panel.
- Kiểm tra: browser drag vào/ra rác thật, xóa chân tháp và vị trí các tầng còn lại; core settle; chưa có history thì ghi rõ B15 bổ sung Undo.

### B14 — Xoay, đổi màu, nhân bản và clear

- Phụ thuộc: B11, B12, B13.
- Làm: thao tác gạch đã chọn, xoay90 theo mốc contract, đổi màu, duplicate với ID mới và vị trí trống; clear với dialog xác nhận. Command cùng core với drag.
- Hoàn thành khi: xoay không làm ra ngoài/xuyên; thất bại không mutate, duplicate không trùng ID; clear hủy giữ nguyên, xác nhận chỉ bỏ gạch và giữ đế.
- Kiểm tra: unit footprint/reject/ID/no-op; browser xoay sát mép, màu model, duplicate, cancel/confirm clear và focus dialog.

### B15 — History và command thống nhất

- Phụ thuộc: B12, B13, B14.
- Làm: Undo/Redo50 trạng thái cho spawn/move/settle/delete/rotate/color/duplicate/clear. Selection/camera/preview không thêm bước; redo branch reset sau edit mới.
- Hoàn thành khi: kéo qua nhiều preview rồi thả chỉ cần một Undo; drop rác và settle được hoàn tác cùng nhau; clear có thể hoàn tác; no-op/invalid/cancel không tăng history.
- Kiểm tra: web core history tests và browser chuỗi spawn→stack→trash→undo→redo; khôi phục toàn layout, không chỉ counter.

### B16 — Tự lưu và phục hồi nháp

- Phụ thuộc: B04, B15.
- Làm: lưu layout hợp lệ sau commit, version/key riêng, validate trước load, phục hồi lỗi/storage quota có thông báo mà vẫn chơi tiếp. Không lưu preview mỗi pointermove.
- Hoàn thành khi: reload giữ công trình/màu/vị trí, không giữ drag đang dở; JSON hỏng/version sai/storage bị chặn không crash; clear ghi đúng nháp.
- Kiểm tra: unit parse/validate/no-write-invalid và browser reload/quota hoặc storage denied. Không đụng key Room Studio.

### B17 — Lưu/chia sẻ, trang chỉ đọc và tạo bản sao

- Phụ thuộc: B08, B10, B16.
- Làm: save title+layout, pending/error/retry với payload/key ổn định, URL snapshot, copy link; viewer lazy chỉ đọc, loading/404/error/retry; copy thành nháp editor qua xác nhận nếu có thay đổi.
- Hoàn thành khi: UI save có row DB thật, mất response sau ghi rồi retry không nhân đôi; reload viewer giữ công trình, chỉnh bản sao không đổi bản gốc/nháp khác âm thầm.
- Kiểm tra: API integration và E2E network failure sau server commit, GET snapshot/reload, read-only/copy, key mới khi lưu bản sửa; viewer không ghi đè local draft.

### B18 — Keyboard, mobile, fallback và PNG

- Phụ thuộc: B14, B15, B16, B17.
- Làm: phím mũi tên dịch x/z theo nút, R xoay, Delete xóa, Escape hủy, Ctrl/⌘+Z và Shift redo; không bắt phím khi đang nhập. Panel mobile quản lý focus, target touch dễ dùng; fallback2D/list/form dùng cùng validation/history. Xuất PNG từ renderer theo hành động người dùng.
- Hoàn thành khi: luồng thêm/chọn/sửa/xóa/Undo/lưu dùng bàn phím được; viewport360/768/1440 không tràn ngang; thiếu/mất WebGL vẫn chỉnh/lưu được bằng fallback; PNG hợp lệ, lỗi export rõ ràng.
- Kiểm tra: Playwright keyboard/touch, ép WebGL unavailable/context lost, PNG signature; axe editor/panel/dialog/viewer và đánh giá ảnh desktop/mobile. Fallback không được giả báo đã xuất PNG.

### B19 — Card thứ năm và điều hướng portfolio

- Phụ thuộc: B05, B17, B18.
- Làm: SVG minh họa nguyên bản, nguồn ảnh, metadata/seed đã có từ B05; card/style/navigation phù hợp portfolio, FE routes editor/viewer/back/forward, cập nhật assertions số project và slug ở test cũ.
- Hoàn thành khi: `/` hiển thị đúng năm card từ DB, click PJ5 mở editor thật; giữ card/link bốn demo cũ và alias Room Studio `/projects/rooms`.
- Kiểm tra: API/public portfolio và test nâng cấp server thật từ DB001–003 không seed; metadata đã sửa giữ nguyên; browser card→PJ5→Back. Không sửa assertion chỉ để che card thiếu.

### B20 — E2E các luồng PJ5

- Phụ thuộc: B11–B19.
- Làm: `tests/e2e/brick-playground.spec.ts` với fixture cô lập trên DB test; kiểm tra hành vi thực và dữ liệu DB, không expose debug endpoint production.
- Hoàn thành khi: bao phủ card→spawn màu→drag/stack→rotate→trash→Undo→reload→save→viewer→copy; invalid/cancel/fullplate/maxcount, retry lỗi API/catalog/storage, keyboard/fallback/mobile đều có bằng chứng. Không skip tiêu chí bắt buộc.
- Kiểm tra: `npm run test:e2e -- tests/e2e/brick-playground.spec.ts`; Chromium thật, 1 worker DB test theo config hiện có; logs/screenshots không giữ credential và cleanup fixture theo ID/schema.

### B21 — Startup, compiled build và hồi quy

- Phụ thuộc: B19, B20.
- Làm: smoke/build verification năm demo và viewer, lazy manifest/network cho PJ5, setup/service lifecycle; giữ direct reload, API/asset404/cookie và process ownership checks.
- Hoàn thành khi: build server phục vụ PJ5 direct/reload, restart API tự migrate DB cũ có card thứ năm; setup tái chạy giữ dữ liệu/config. Trên portfolio không tải renderer3D của PJ5; chỉ tải khi vào editor/viewer. Bốn demo cũ vẫn hoạt động.
- Kiểm tra: `npm run build`, `npm run verify:build`, owned stop/start và `npm run smoke`; đối chiếu dữ liệu trước/sau. Không chạy nhiều integration suite đồng thời trên DB chung.

### B22 — Nghiệm thu, tài liệu và nhật ký cuối

- Phụ thuộc: B01–B21.
- Làm: review comment các function placement/settle/drag/history/draft/transaction/key retry; cập nhật README root/web/API, architecture/API contract, số project hiện tại và docs/verification.md. Ghi kết quả task đã thực chạy, không dùng số test cũ cho PJ5.
- Hoàn thành khi: checklist B01–B22 đạt, không còn mock runtime/bắt buộc chưa test; đủ bằng chứng các luồng chính, DB nâng cấp và bốn demo cũ. Tính năng ngoài MVP vẫn ghi rõ là tương lai.
- Kiểm tra: `npm run check`, `npm run format:check`, `git diff --check`, scan tracked changes không chứa secret/artifact; sau sửa lỗi chạy lại kiểm tra bị ảnh hưởng. Ghi lệnh/kết quả/fail/skip/chưa chạy đúng thực tế. Không tự publish/deploy.

## 5. Nhịp thực hiện và nhật ký

Thứ tự mặc định B01→B22. B05 và B06 cùng phụ thuộc B04, B09/B10 không cần B07/B08 đã xong; khi DB có blocker đã chứng minh, tiếp tục phần có đủ phụ thuộc rồi quay lại DB. Đây là phụ thuộc công việc, không yêu cầu dùng nhiều agent.

Sau mỗi task: chạy kiểm tra phù hợp, sửa lỗi và kiểm tra lại, ghi log trước khi đánh dấu; tự chuyển task kế tiếp khi đã được giao chạy toàn bộ. Không cần chạy toàn bộ suite sau mỗi sửa tài liệu; không tính check zero-test là đạt. Chỉ dừng khi có blocker bên ngoài thật sự sau khi đã hết phần độc lập.

Mẫu nhật ký thêm vào `PORTFOLIO_TASKS.md`:

```text
Task: Bxx
Trạng thái: đang làm / hoàn thành / bị chặn
File thay đổi:
Lệnh kiểm tra và kết quả thực (số test, fail/skip):
Tiêu chí còn thiếu / blocker:
Task tiếp theo có đủ phụ thuộc:
```

Triển khai dùng Three/Fiber/Drei hiện có, không thêm dependency hoặc sửa lockfile; migration004 giữ001–003. Kế hoạch này giữ tiêu chí và phụ thuộc để đối chiếu, không dùng thay bằng chứng kiểm tra trong nhật ký. Người dùng đã yêu cầu đẩy lên GitHub sau khi hoàn thành; việc publish môi trường/deploy ứng dụng vẫn là thao tác riêng.
