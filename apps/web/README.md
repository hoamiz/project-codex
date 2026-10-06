# Web

React 19/TypeScript, Vite 8, Tailwind 4, React Router và TanStack Query. Từ project root sau setup: `npm run dev:web` (5173); cần API ở 4100. Vite proxy `/api` đến `API_TARGET` hoặc loopback 4100. Routes/hướng dẫn đầy đủ nằm trong [root README](../../README.md).

Build: `npm run build -w @project-codex/web`; output `dist`. Express phục vụ build và SPA fallback. Không đặt secret trong `VITE_*`. API client gửi cookie cùng origin, CSRF cho admin mutations, giữ lỗi theo field; session 401 làm sạch cache và về login.

`npm run test -w @project-codex/web`: component/storage test jsdom. Playwright ở root kiểm tra luồng thật và accessibility. Profile tại `src/features/portfolio.tsx`; ảnh SVG có nguồn trong `public/images/SOURCES.md`.
