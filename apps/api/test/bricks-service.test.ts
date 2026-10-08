import { beforeAll, afterAll, test, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { pool } from '../src/db.js';
import { migrate } from '../src/services/migrations.js';
import { saveBrickDesign, readBrickDesign } from '../src/services/bricks.js';
import { tower } from '../../web/src/features/brick-playground/brick-fixture';
const keys: string[] = [];
beforeAll(() => migrate(pool));
afterAll(async () => {
  await pool.query('DELETE FROM brick_designs WHERE idempotency_key=ANY($1::uuid[])', [keys]);
  await pool.end();
});
test('concurrent save/reordered canonical retry creates one immutable snapshot and key conflicts preserve it', async () => {
  const key = randomUUID();
  keys.push(key);
  const [a, b] = await Promise.all([
    saveBrickDesign(pool, tower, key),
    saveBrickDesign(pool, { ...tower, bricks: [...tower.bricks].reverse() }, key),
  ]);
  expect([a.existing, b.existing].sort()).toEqual([false, true]);
  expect(a.data.id).toBe(b.data.id);
  expect(
    (await pool.query('SELECT count(*) FROM brick_designs WHERE idempotency_key=$1', [key])).rows[0]
      .count,
  ).toBe('1');
  await expect(saveBrickDesign(pool, { ...tower, title: 'Bản khác' }, key)).rejects.toMatchObject({
    status: 409,
  });
  expect((await readBrickDesign(pool, a.data.id)).layout).toEqual(tower);
});
test('database failure rolls back and releases the connection so the same key can save later', async () => {
  const schema = `brick_failure_${randomUUID().replaceAll('-', '')}`;
  await pool.query(`CREATE SCHEMA "${schema}"`);
  const url = new URL(process.env.TEST_DATABASE_URL!);
  url.searchParams.set('options', `-c search_path=${schema}`);
  const isolated = new Pool({ connectionString: url.href, max: 1 });
  try {
    await pool.query(
      `CREATE TABLE "${schema}".brick_designs (LIKE public.brick_designs INCLUDING ALL)`,
    );
    await isolated.query("ALTER TABLE brick_designs ADD CHECK(title <> 'Failure fixture')");
    const key = randomUUID();
    await expect(
      saveBrickDesign(isolated, { ...tower, title: 'Failure fixture' }, key),
    ).rejects.toThrow();
    expect((await isolated.query('SELECT count(*) FROM brick_designs')).rows[0].count).toBe('0');
    expect((await saveBrickDesign(isolated, tower, key)).existing).toBe(false);
  } finally {
    await isolated.end();
    await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
  }
});
