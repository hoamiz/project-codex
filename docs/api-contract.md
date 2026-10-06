# API và model

Dùng hợp đồng model trong PORTFOLIO_TASKS.md. Prefix `/api`; dữ liệu `{ data }`, danh sách `{ data, pagination: { page, pageSize, total, totalPages } }`, lỗi `{ error: { code, message, fields? } }`. Validation 400, auth 401, forbidden 403, missing 404, conflict 409, rate limit 429, database unavailable 503; không trả stack trace.

- GET /health; GET /portfolio/projects.
- GET /cars: search, brand, minPrice, maxPrice, year, status, sort, page, pageSize; GET /cars/brands; GET /cars/by-ids?ids=...; GET /cars/:slug.
- POST /leads: Idempotency-Key, carId, type, name, phone, email?, preferredAt?, message?.
- POST /auth/login; GET /auth/me (CSRF token); POST /auth/logout.
- Admin: GET/POST /admin/cars; GET/PATCH/DELETE /admin/cars/:id (DELETE archives); GET /admin/leads; GET/PATCH /admin/leads/:id; GET /admin/stats. Mutations dùng X-CSRF-Token và origin hợp lệ; PATCH có version.
- Game: POST /games/memory/sessions {difficulty: easy|medium|hard}; GET /games/memory/sessions/:id; POST /games/memory/sessions/:id/flips {cardId, version}; POST /games/memory/sessions/:id/results {nickname}; GET /games/memory/leaderboard?difficulty=...&page=... . Phiên yêu cầu X-Game-Token. Score/time không nhận từ client. State public chỉ lộ mặt đang mở hoặc đã ghép. Một cặp sai khóa lượt 800ms; thời gian và xếp hạng do server tính.

Routes FE: /, /projects/autohub, /projects/autohub/cars/:slug, /projects/autohub/compare, /projects/memory-match, /projects/admin/login, /projects/admin, /projects/admin/cars, /projects/admin/leads; còn lại 404.

Lead retry: key được khóa theo transaction; cùng key/hash trả bản ghi đã lưu kể cả sau archive hoặc ngày hẹn đã qua. Yêu cầu mới validate ngày tương lai và khóa row xe available để không chạy đua với archive. Client gửi lại dữ liệu khác cùng key nhận409.
