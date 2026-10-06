import { z } from 'zod';
import { pool } from '../db.js';
import { hashPassword } from '../services/password.js';
try {
  const email = z.email().parse(process.env.ADMIN_EMAIL).toLowerCase();
  const password = z.string().min(14).max(200).parse(process.env.ADMIN_PASSWORD);
  await pool.query(
    'INSERT INTO admin_users(email,password_hash) VALUES($1,$2) ON CONFLICT(email) DO NOTHING',
    [email, await hashPassword(password)],
  );
  console.log('Local admin initialized; credentials remain in ignored configuration');
} finally {
  await pool.end();
}
