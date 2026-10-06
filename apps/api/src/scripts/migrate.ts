import { pool } from '../db.js';
import { migrate } from '../services/migrations.js';
try {
  await migrate(pool);
  console.log('Migrations applied');
} finally {
  await pool.end();
}
