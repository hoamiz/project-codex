import { z } from 'zod';
import type { Pool } from 'pg';
import { hashPassword } from './password.js';

/** Bootstrap chỉ thêm tài khoản chưa có; validate trước query và không đổi password khi job/release chạy lại. */
export async function bootstrapAdmin(pool: Pool, rawEmail: unknown, rawPassword: unknown) {
  const email = z.email().parse(rawEmail).toLowerCase();
  const password = z.string().min(14).max(200).parse(rawPassword);
  await pool.query(
    'INSERT INTO admin_users(email,password_hash) VALUES($1,$2) ON CONFLICT(email) DO NOTHING',
    [email, await hashPassword(password)],
  );
}
