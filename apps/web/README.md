# Web

React 19/TypeScript, Vite 8, Tailwind 4, React Router và TanStack Query. Từ project root sau setup: `npm run dev:web` (5173); cần API ở 4100. Vite proxy `/api` đến `API_TARGET` hoặc loopback 4100. Routes/hướng dẫn đầy đủ nằm trong [root README](../../README.md).

Build: `npm run build -w @project-codex/web`; output `dist`. Express phục vụ build và SPA fallback. Không đặt secret trong `VITE_*`. API client gửi cookie cùng origin, CSRF cho admin mutations, giữ lỗi theo field; session 401 làm sạch cache và về login.

`npm run test -w @project-codex/web`: component/storage test jsdom. Playwright ở root kiểm tra luồng thật và accessibility. Profile tại `src/features/portfolio.tsx`; ảnh SVG có nguồn trong `public/images/SOURCES.md`.

`src/features/room-studio/` là demo thứ tư, lazy-load từ router: `index.tsx` quản lý editor/chia sẻ, `room-core.ts` kiểm tra placement/history/draft, `room-models.tsx` tạo sáu model bằng hình học, `room-scene.tsx` dựng phòng/camera/kéo theo raycast và fallback 2D, `room.css` giới hạn theme trong studio. Catalog lấy từ `/api/rooms/catalog`; fixture v1 chỉ dùng cho unit test. WebGL render theo nhu cầu, DPR tối đa1,5 và shadow map1024 để giảm tải. Tải ảnh PNG cần WebGL; các thao tác chỉnh qua bảng vẫn dùng được ở 2D. Bản build có manifest để smoke xác minh bundle 3D chưa tải trên portfolio.
