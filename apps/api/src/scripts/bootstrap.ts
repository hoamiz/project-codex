import { pool } from '../db.js';
import { bootstrapAdmin } from '../services/bootstrap-admin.js';
try {
  await bootstrapAdmin(pool, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  console.log(
    'Admin initialized without overwriting an existing account; credentials were not logged',
  );
} finally {
  await pool.end();
}
