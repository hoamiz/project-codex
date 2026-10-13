import { createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import type { RequestHandler } from 'express';
import { HttpError } from '../errors.js';

/** Chỉ gateway đã biết secret mới được đặt IP/protocol. Ghi đè forwarded headers trước limiter/session, không tin client gửi trực tiếp vào Render. */
export function proxyBoundary(secret: string | undefined): RequestHandler {
  const expected = secret ? createHash('sha256').update(secret).digest() : null;
  return (req, _res, next) => {
    if (!expected) return next();
    const token = req.get('X-Codex-Proxy-Token') || '';
    const clientIp = req.get('X-Codex-Client-IP') || '';
    if (
      token.length > 512 ||
      !timingSafeEqual(expected, createHash('sha256').update(token).digest()) ||
      !isIP(clientIp)
    )
      return next(new HttpError(403, 'PROXY', 'Nguồn truy cập không hợp lệ.'));
    req.headers['x-forwarded-for'] = clientIp;
    req.headers['x-forwarded-proto'] = 'https';
    delete req.headers['x-codex-proxy-token'];
    next();
  };
}
