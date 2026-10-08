# Web

React 19/TypeScript, Vite 8, Tailwind 4, React Router và TanStack Query. Từ project root sau setup: `npm run dev:web` (5173); cần API ở 4100. Vite proxy `/api` đến `API_TARGET` hoặc loopback 4100. Routes/hướng dẫn đầy đủ nằm trong [root README](../../README.md).

Build: `npm run build -w @project-codex/web`; output `dist`. Express phục vụ build và SPA fallback. Không đặt secret trong `VITE_*`. API client gửi cookie cùng origin, CSRF cho admin mutations, giữ lỗi theo field; session 401 làm sạch cache và về login.

`npm run test -w @project-codex/web`: component/storage test jsdom. Playwright ở root kiểm tra luồng thật và accessibility. Profile tại `src/features/portfolio.tsx`; ảnh SVG có nguồn trong `public/images/SOURCES.md`.

`src/features/room-studio/` là demo thứ tư, lazy-load từ router: `index.tsx` quản lý editor/chia sẻ, `room-core.ts` kiểm tra placement/history/draft, `room-models.tsx` tạo sáu model bằng hình học, `room-scene.tsx` dựng phòng/camera/kéo theo raycast và fallback 2D, `room.css` giới hạn theme trong studio. Catalog lấy từ `/api/rooms/catalog`; fixture v1 chỉ dùng cho unit test. WebGL render theo nhu cầu, DPR tối đa1,5 và shadow map1024 để giảm tải. Tải ảnh PNG cần WebGL; các thao tác chỉnh qua bảng vẫn dùng được ở 2D. Bản build có manifest để smoke xác minh bundle 3D chưa tải trên portfolio.

`src/features/brick-playground/` là demo thứ năm: `index.tsx` lấy catalog/snapshot API; `brick-editor.tsx` quản lý commands/panel/history/draft/share; `brick-viewer.tsx` xem và copy; `brick-viewport.tsx` lazy-load scene; `brick-scene.tsx` xử lý raycast/pointer capture/camera/fallback2D; `brick-models.tsx` dùng geometry/material cache và instancing cho nút đế. Theme riêng ở `brick-playground.css`. `brick-core.ts` quản lý history50/nháp và re-export geometry thuần từ `apps/api/src/services/brick-geometry.ts` để FE/API thống nhất footprint/point support/settle. Module chung không có Node, SQL hay secret; catalog runtime vẫn lấy từ API. Fixture chỉ dùng trong test.

Đế32×32/10 loại/8 màu/max150, snap nguyên và settle là logic thuần; kéo chỉ preview, thả hợp lệ mới tạo một command/history/nháp. Chuyển edit/orbit giữ Canvas/camera; mất context có sơ đồ2D và nút thử3D lại. PNG cần WebGL; chọn/xoay/màu/nhân bản/tọa độ/xóa/lưu vẫn dùng được ở2D. Nháp key `project-codex:brick-playground:v1`; JSON/version/geometry sai được bỏ an toàn, storage bị chặn không làm hỏng editor. Share dùng key ổn định cho cùng payload sau retry; snapshot/copy không ghi đè bản gốc. Playwright kiểm tra WebGL/pointer/touch thật, DB snapshot và axe tại360/768/1440.
