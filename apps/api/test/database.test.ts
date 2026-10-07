import { test, expect, afterAll } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pool } from '../src/db.js';
import { migrate } from '../src/services/migrations.js';
import { seed } from '../src/services/seed.js';
afterAll(() => pool.end());
test('migrations repeat safely and failing SQL rolls back', async () => {
  await migrate(pool);
  await migrate(pool);
  const dir = await mkdtemp(`${tmpdir()}/project-codex-migration-`);
  try {
    await writeFile(
      `${dir}/999_failure.sql`,
      'CREATE TABLE should_rollback(id int); SELECT * FROM table_does_not_exist;',
    );
    await expect(migrate(pool, dir)).rejects.toThrow();
    expect((await pool.query("SELECT to_regclass('should_rollback') AS t")).rows[0].t).toBe(null);
  } finally {
    await rm(dir, { recursive: true });
  }
});
test('constraints reject invalid prices, duplicates and missing FK', async () => {
  await seed(pool);
  const car = (await pool.query('SELECT * FROM cars LIMIT 1')).rows[0];
  await expect(pool.query('UPDATE cars SET price_vnd=-1 WHERE id=$1', [car.id])).rejects.toThrow();
  await expect(
    pool.query(
      'UPDATE cars SET slug=$1 WHERE id!=(SELECT id FROM cars WHERE slug=$1) AND id=(SELECT id FROM cars WHERE slug!=$1 LIMIT 1)',
      [car.slug],
    ),
  ).rejects.toThrow();
  await expect(
    pool.query(
      "INSERT INTO leads(car_id,type,name,phone,idempotency_key,payload_hash) VALUES(gen_random_uuid(),'consultation','Test','0900000000','missing-fk','h')",
    ),
  ).rejects.toThrow();
});
test('seed is idempotent and preserves edited records', async () => {
  await seed(pool);
  const before = (await pool.query('SELECT count(*) FROM cars')).rows[0].count;
  const original = (await pool.query("SELECT description FROM cars WHERE slug='toyota-camry'"))
    .rows[0].description;
  try {
    await pool.query("UPDATE cars SET description='edited fixture' WHERE slug='toyota-camry'");
    await seed(pool);
    expect((await pool.query('SELECT count(*) FROM cars')).rows[0].count).toBe(before);
    expect(
      (await pool.query("SELECT description FROM cars WHERE slug='toyota-camry'")).rows[0]
        .description,
    ).toBe('edited fixture');
  } finally {
    await pool.query("UPDATE cars SET description=$1 WHERE slug='toyota-camry'", [original]);
  }
  expect((await pool.query('SELECT count(*) FROM portfolio_projects')).rows[0].count).toBe('4');
});
