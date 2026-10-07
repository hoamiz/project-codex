# Room Studio 3D — PJ4

Phạm vi được giao ngày 2026-10-07: một phòng low poly 6×5 m, tối đa 24 món đồ, sáu loại nội thất (giường, bàn, ghế, kệ, đèn, cây), ba bảng màu sage/peach/lavender, góc nhìn isometric. Không cần model/font/CDN bên ngoài; hình học được tạo trong Three.js.

Editor: thêm/chọn/kéo đồ trên mặt sàn, snap 0,25 m, xoay 90°, đổi màu, xóa, undo/redo; đổi tường/sàn, ngày/đêm; camera xoay/zoom/đặt lại, hỗ trợ thao tác bàn phím và panel trên mobile. Không đặt đồ chồng nhau hoặc ra khỏi phòng. Có phòng mẫu và thao tác làm trống qua xác nhận. Thử thách nhỏ: góc làm việc có bàn, ghế, đèn và tối đa 5 món.

Lưu nháp cục bộ sau mỗi thay đổi hợp lệ. Nút lưu/chia sẻ tạo snapshot bất biến trong PostgreSQL, retry cùng key không nhân đôi. Trang chia sẻ chỉ đọc và có thao tác tạo bản sao cục bộ. Người không có WebGL vẫn xem/chỉnh bằng sơ đồ 2D và các trường vị trí. 3D được lazy-load để không tăng tải ban đầu của các demo khác.

## Route và dữ liệu

- Editor: `/projects/room-studio`.
- Xem bản lưu: `/projects/room-studio/view/:id` (UUID).
- `GET /api/rooms/catalog`: kích thước phòng, nội thất, palette và phòng mẫu — nguồn dữ liệu chung cho editor và validation.
- `POST /api/rooms`: body `{ layout }`, header `Idempotency-Key` UUID. Trả201 cho bản mới, 200 cho retry cùng payload, 409 nếu key đã dùng với dữ liệu khác. Giới hạn tần suất, validate cấu trúc/giới hạn/vị trí/collision tại API.
- `GET /api/rooms/:id`: `{ data: { id, title, layout, createdAt } }`; 400 nếu ID sai, 404 nếu không có.
- Layout v1: `schemaVersion`, `title`, `palette`, `wallColor`, `floorColor`, `lighting`, `items[]`; mỗi món gồm `id`, `kind`, `x`, `z`, `rotation` (0/90/180/270) và `color` hex. Tọa độ tính từ giữa phòng, đơn vị mét. Tất cả món đặt trên sàn.
- Migration mới mở whitelist URL portfolio cho PJ4 và tạo `room_designs` có layout JSONB, key unique và payload hash. Giữ migration cũ/checksum và dữ liệu hiện có. Seed thêm PJ4 bằng `ON CONFLICT DO NOTHING`.

## Các điểm nghiệm thu

| Task | Phụ thuộc | Tiêu chí kiểm tra |
| --- | --- | --- |
| R01: công cụ/hợp đồng | Không | Dependency tương thích React19; WebGL2 trong Chromium; hợp đồng được ghi |
| R02: DB/API | R01 | Migration lặp an toàn, seed4 project; validation/collision, lưu/đọc, retry đồng thời, conflict/404 test với DB thật |
| R03: renderer | R01 | Sáu model, sàn/tường/ánh sáng/camera render WebGL thật; có fallback 2D |
| R04: editor | R02/R03 | Thêm/kéo/xoay/đổi màu/xóa, undo/redo, local draft, giới hạn placement; unit test logic và browser thao tác |
| R05: lưu/chia sẻ | R02/R04 | Snapshot DB, mở URL và reload, chỉ đọc, tạo bản sao; lỗi lưu/retry rõ ràng |
| R06: portfolio | R02/R05 | Bốn card/route đúng, lazy chunk, smoke/build phục vụ deep link; giữ ba demo cũ |
| R07: nghiệm thu | R01–R06 | Lint/typecheck/build, unit/API/E2E, WebGL/2D, mobile360/768/desktop1440, axe, docs và startup được cập nhật |

Tham chiếu checklist/nhật ký: `PORTFOLIO_TASKS.md`, bằng chứng cuối: `docs/verification.md`. Không commit/push/deploy trong yêu cầu triển khai này.
