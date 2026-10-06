import { pool } from '../db.js';
import { seed } from '../services/seed.js';
try {
  await seed(pool);
  console.log('Demo data seeded without overwriting existing rows');
} finally {
  await pool.end();
}
