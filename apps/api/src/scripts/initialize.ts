import { z } from 'zod';
import { pool } from '../db.js';
import { migrate } from '../services/migrations.js';
import { seed } from '../services/seed.js';
import { bootstrapAdmin } from '../services/bootstrap-admin.js';

/** Job khởi tạo được gọi tường minh một lần với credential riêng; lần chạy lại vẫn bảo toàn metadata/password. Không đưa bootstrap vào startup. */
try {
  const email = z.email().parse(process.env.ADMIN_EMAIL);
  const password = z.string().min(14).max(200).parse(process.env.ADMIN_PASSWORD);
  await migrate(pool);
  await seed(pool);
  await bootstrapAdmin(pool, email, password);
  console.log('Database initialized with five demos; existing data/accounts preserved.');
} catch {
  console.error(
    'Initialization failed. Check configuration and database; no credential was logged.',
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
