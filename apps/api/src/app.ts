import express from 'express';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pool } from './db.js';
import { publicRouter } from './routes/public.js';
import { authRouter, sessionMiddleware } from './routes/auth.js';
import { gameRouter } from './routes/game.js';
import { adminRouter } from './routes/admin.js';
import { leadsRouter } from './routes/leads.js';
import { roomsRouter } from './routes/rooms.js';
import { bricksRouter } from './routes/bricks.js';
import { errorHandler } from './errors.js';
import { config } from './config.js';
export const app = express();
app.disable('x-powered-by');
// Chỉ tin reverse proxy loopback khi được cấu hình, để cookie Secure hoạt động sau HTTPS termination.
app.set('trust proxy', config.trustProxy);
app.use(express.json({ limit: '32kb' }));
app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ data: { status: 'ok' } });
});
app.use(sessionMiddleware);
app.use(
  '/api',
  publicRouter,
  leadsRouter,
  authRouter,
  adminRouter,
  gameRouter,
  roomsRouter,
  bricksRouter,
);
const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
app.use(express.static(webDist, { index: false }));
/** Chỉ route trang mới dùng SPA fallback; API và asset thiếu vẫn trả404. */
app.get(/^\/(?!api(?:\/|$)).*/, (req, res, next) => {
  if (
    path.extname(req.path) ||
    !req.accepts('html') ||
    !existsSync(path.join(webDist, 'index.html'))
  )
    return next();
  res.sendFile(path.join(webDist, 'index.html'));
});
app.use((_req, res) =>
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy tài nguyên' } }),
);
app.use(errorHandler);
