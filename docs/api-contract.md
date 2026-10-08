# API và model

Dùng hợp đồng model trong PORTFOLIO_TASKS.md. Prefix `/api`; dữ liệu `{ data }`, danh sách `{ data, pagination: { page, pageSize, total, totalPages } }`, lỗi `{ error: { code, message, fields? } }`. Validation 400, auth 401, forbidden 403, missing 404, conflict 409, body quá32KB413, rate limit 429, database unavailable 503; không trả stack trace.

- GET /health; GET /portfolio/projects.
- GET /cars: search, brand, minPrice, maxPrice, year, status, sort, page, pageSize; GET /cars/brands; GET /cars/by-ids?ids=...; GET /cars/:slug.
- POST /leads: Idempotency-Key, carId, type, name, phone, email?, preferredAt?, message?.
- POST /auth/login; GET /auth/me (CSRF token); POST /auth/logout.
- Admin: GET/POST /admin/cars; GET/PATCH/DELETE /admin/cars/:id (DELETE archives); GET /admin/leads; GET/PATCH /admin/leads/:id; GET /admin/stats. Mutations dùng X-CSRF-Token và origin hợp lệ; PATCH có version.
- Game: POST /games/memory/sessions {difficulty: easy|medium|hard}; GET /games/memory/sessions/:id; POST /games/memory/sessions/:id/flips {cardId, version}; POST /games/memory/sessions/:id/results {nickname}; GET /games/memory/leaderboard?difficulty=...&page=... . Phiên yêu cầu X-Game-Token. Score/time không nhận từ client. State public chỉ lộ mặt đang mở hoặc đã ghép. Một cặp sai khóa lượt 800ms; thời gian và xếp hạng do server tính.

Routes FE: /, /projects/autohub, /projects/autohub/cars/:slug, /projects/autohub/compare, /projects/memory-match, /projects/admin/login, /projects/admin, /projects/admin/cars, /projects/admin/leads; còn lại 404.

Room Studio thêm `/projects/room-studio` và `/projects/room-studio/view/:id` (UUID). Brick Playground thêm `/projects/brick-playground` và `/projects/brick-playground/view/:id` (UUID). Metadata portfolio hiện gồm5 slug: autohub, memory-match, admin, room-studio, brick-playground theo thứ tự này.

Alias frontend `/projects/rooms` chuyển sang `/projects/room-studio`, giữ query/hash và thay entry history để Back quay lại trang trước. Alias không đổi URL metadata hoặc API `/rooms`.

| Endpoint `/api` | Hợp đồng |
| --- | --- |
| `GET /rooms/catalog` | `{data:{room:{width:6,depth:5,snap:0.25,maxItems:24},items,palettes,starter}}` |
| `POST /rooms` | `{layout}`; Origin hợp lệ, UUID `Idempotency-Key`; 201 bản mới, 200 retry cùng payload, 409 payload khác cùng key; 30 lần/15 phút/IP |
| `GET /rooms/:id` | `{data:{id,title,layout,createdAt}}`; 400 UUID sai, 404 không có |

Layout strict v1: `schemaVersion:1`, `title`2–80 ký tự đã trim, `palette:sage|peach|lavender`, `wallColor/floorColor:#RRGGBB`, `lighting:day|night`, `items` tối đa24. Mỗi item strict gồm UUID `id` duy nhất trong layout, `kind:bed|desk|chair|shelf|lamp|plant`, số hữu hạn `x/z` bội0,25m tính từ tâm, `rotation:0|90|180|270`, `color:#RRGGBB`. Footprint sau xoay phải nằm trong sàn6×5m và không chồng footprint khác; tiếp xúc mép được phép. API chuẩn hóa màu sang chữ thường và trả lỗi400 nếu vi phạm. Snapshot public, bất biến, không có PATCH/DELETE; chỉnh sửa lưu thành bản mới. Retry cùng key khóa transaction và so hash của layout đã chuẩn hóa.

Lead retry: key được khóa theo transaction; cùng key/hash trả bản ghi đã lưu kể cả sau archive hoặc ngày hẹn đã qua. Yêu cầu mới validate ngày tương lai và khóa row xe available để không chạy đua với archive. Client gửi lại dữ liệu khác cùng key nhận409.

## Brick Playground 3D

| Endpoint `/api` | Hợp đồng |
| --- | --- |
| `GET /bricks/catalog` | `{data:{schemaVersion:1,baseplate:{width:32,depth:32,maxHeight:48,maxBricks:150},kinds,colors}}` |
| `POST /bricks/designs` | Strict `{layout}`; Origin hợp lệ, UUID `Idempotency-Key`; 201 mới,200 retry,409 cùng key/payload khác;30 lần/15 phút/IP |
| `GET /bricks/designs/:id` | `{data:{id,title,layout,createdAt}}`;400 UUID sai,404 không có |

Layout strict v1: `{schemaVersion:1,title,bricks}`. `title` trim2–80 ký tự. Tối đa150 brick strict `{id,kind,color,x,y,z,rotation}`; UUID duy nhất, kind thuộc10 loại/màu thuộc8 giá trị [catalog](brick-playground-plan.md#catalog), tọa độ nguyên hữu hạn, rotation0/90/180/270. `x/z` là góc thấp nhất của footprint, `y` là đáy theo đơn vị plate, không phải tọa độ tâm/world của renderer. Brick cao3plate, plate cao1. Bounds `[0,32)` theo x/z và `y+height<=48`; xoay90/270 hoán đổi footprint, các thể tích không xuyên nhau, tiếp xúc mặt/mép được phép. Gạch có đáy trên0 phải tựa lên ít nhất một nút trên mặt trên gạch khác. API không tự settle gạch lơ lửng; vi phạm/unknown field/trùng ID trả400 với lỗi field khi có.

Chuẩn hóa title/màu/UUID và sort brick theoUUID trước hash; đổi thứ tự mảng hoặc casing vẫn là cùng payload chuẩn hóa. Advisory transaction lock theo key bảo đảm retry đồng thời một row;200 trả đúng snapshot đã lưu. Response gồm id/title/layout/createdAt, không trả key/hash. Không có PATCH/DELETE/list public. Chỉnh bản chia sẻ bằng copy rồi lưu snapshot mới; không có tài khoản hoặc endpoint sửa bản gốc.
