import { Router, type RequestHandler } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { pool } from '../db.js';
import { config } from '../config.js';
import { HttpError } from '../errors.js';
import { hashPassword, verifyPassword } from '../services/password.js';
declare module 'express-session' {
  interface SessionData {
    userId: string;
    csrfToken: string;
  }
}
const PgStore = connectPgSimple(session);
export const sessionMiddleware = session({
  name: 'codex.sid',
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: new PgStore({ pool, tableName: 'auth_sessions', pruneSessionInterval: false }),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.production,
    maxAge: 2 * 60 * 60 * 1000,
  },
});
/** Cookie auth phải đi cùng origin hợp lệ; token chống CSRF bổ sung cho mọi mutation đã đăng nhập. */
export const checkOrigin: RequestHandler = (req, _res, next) => {
  const allowed = new Set([config.webOrigin]);
  if (!config.production) {
    const other = new URL(config.webOrigin);
    other.hostname = other.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    allowed.add(other.origin);
  }
  if (!allowed.has(req.get('Origin') || ''))
    return next(new HttpError(403, 'ORIGIN', 'Nguồn yêu cầu không hợp lệ.'));
  next();
};
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.session.userId) return next(new HttpError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.'));
  next();
};
export const checkCsrf: RequestHandler = (req, _res, next) => {
  if (!req.session.csrfToken || req.get('X-CSRF-Token') !== req.session.csrfToken)
    return next(new HttpError(403, 'CSRF', 'Phiên xác thực cần được làm mới.'));
  next();
};
export const authRouter = Router();
const limit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMIT', message: 'Thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.' },
  },
});
authRouter.post('/auth/login', checkOrigin, limit, async (req, res) => {
  const { email, password } = z
    .object({
      email: z.email().transform((x) => x.toLowerCase()),
      password: z.string().min(1).max(200),
    })
    .strict()
    .parse(req.body);
  const user = (
    await pool.query('SELECT id,email,password_hash FROM admin_users WHERE email=$1', [email])
  ).rows[0];
  const valid = user
    ? await verifyPassword(password, user.password_hash)
    : (await hashPassword(password), false);
  if (!valid) throw new HttpError(401, 'INVALID_LOGIN', 'Email hoặc mật khẩu không đúng.');
  await new Promise<void>((resolve, reject) =>
    req.session.regenerate((err) => (err ? reject(err) : resolve())),
  );
  req.session.userId = user.id;
  req.session.csrfToken = randomBytes(32).toString('hex');
  await new Promise<void>((resolve, reject) =>
    req.session.save((err) => (err ? reject(err) : resolve())),
  );
  res.json({ data: { email: user.email, csrfToken: req.session.csrfToken } });
});
authRouter.get('/auth/me', requireAdmin, async (req, res) => {
  const row = (await pool.query('SELECT email FROM admin_users WHERE id=$1', [req.session.userId]))
    .rows[0];
  if (!row) throw new HttpError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');
  res.json({ data: { email: row.email, csrfToken: req.session.csrfToken } });
});
authRouter.post('/auth/logout', requireAdmin, checkOrigin, checkCsrf, async (req, res) => {
  await new Promise<void>((resolve, reject) =>
    req.session.destroy((err) => (err ? reject(err) : resolve())),
  );
  res.clearCookie('codex.sid', { httpOnly: true, sameSite: 'lax', secure: config.production });
  res.json({ data: { loggedOut: true } });
});
