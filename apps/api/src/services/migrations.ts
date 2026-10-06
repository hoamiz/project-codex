import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { fileURLToPath } from 'node:url';
/** Áp dụng từng migration trong transaction; checksum ngăn sửa lịch sử đã chạy. Lock bảo vệ hai tiến trình cùng khởi tạo. */
export async function migrate(
  pool: Pool,
  dir = fileURLToPath(new URL('../../db/migrations', import.meta.url)),
) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(741093)');
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    for (const name of (await readdir(dir)).filter((n) => n.endsWith('.sql')).sort()) {
      const sql = await readFile(`${dir}/${name}`, 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const old = await client.query('SELECT checksum FROM schema_migrations WHERE name=$1', [
        name,
      ]);
      if (old.rowCount) {
        if (old.rows[0].checksum !== checksum) throw new Error(`Changed migration: ${name}`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [
          name,
          checksum,
        ]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(741093)');
    client.release();
  }
}
