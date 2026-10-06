import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
/** Salt riêng cho mỗi mật khẩu; chỉ lưu digest, không thể đọc lại password từ database. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await derive(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
/** So sánh constant-time sau khi kiểm tra độ dài để không ném lỗi với hash hỏng. */
export async function verifyPassword(password: string, hash: string) {
  const [salt, digest] = hash.split(':');
  if (!/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(digest || '')) return false;
  const key = (await derive(password, salt, 64)) as Buffer;
  return timingSafeEqual(key, Buffer.from(digest, 'hex'));
}
