import { beforeAll, afterAll, test, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db.js';
import { migrate } from '../src/services/migrations.js';
import { brickCatalog } from '../src/services/bricks.js';
import { config } from '../src/config.js';
import { randomUUID } from 'node:crypto';
import { tower, fixtureBrick as b } from '../../web/src/features/brick-playground/brick-fixture';
const keys: string[] = [];
function save(layout: unknown, key = randomUUID()) {
  keys.push(key);
  return request(app)
    .post('/api/bricks/designs')
    .set('Origin', config.webOrigin)
    .set('Idempotency-Key', key)
    .send({ layout });
}
beforeAll(() => migrate(pool));
afterAll(async () => {
  await pool.query('DELETE FROM brick_designs WHERE idempotency_key=ANY($1::uuid[])', [keys]);
  await pool.end();
});
test('catalog has ten shapes, eight named colors and fixed base limits; unknown API remains JSON404', async () => {
  const res = await request(app).get('/api/bricks/catalog');
  expect(res.status).toBe(200);
  expect(res.body.data).toEqual(brickCatalog);
  expect(res.body.data.kinds).toHaveLength(10);
  expect(res.body.data.colors).toHaveLength(8);
  expect((await request(app).get('/api/bricks/missing')).status).toBe(404);
});
test('API snapshot writes real DB, normalizes safely, reads only and concurrent retry is idempotent', async () => {
  const key = randomUUID();
  const [a, c] = await Promise.all([
    save({ ...tower, title: ' <b>Nhà</b> ' }, key),
    save({ ...tower, title: '<b>Nhà</b>', bricks: [...tower.bricks].reverse() }, key),
  ]);
  expect([a.status, c.status].sort()).toEqual([200, 201]);
  expect(a.body.data.id).toBe(c.body.data.id);
  const row = (await pool.query('SELECT layout FROM brick_designs WHERE id=$1', [a.body.data.id]))
    .rows[0];
  expect(row.layout.title).toBe('<b>Nhà</b>');
  expect(
    (await request(app).get(`/api/bricks/designs/${a.body.data.id}`)).body.data.layout,
  ).toEqual(row.layout);
  expect((await save(tower, key)).status).toBe(409);
  expect(
    (await request(app).patch(`/api/bricks/designs/${a.body.data.id}`).send({ layout: tower }))
      .status,
  ).toBe(404);
  expect((await request(app).get(`/api/bricks/designs/${randomUUID()}`)).status).toBe(404);
  expect((await request(app).get('/api/bricks/designs/not-an-id')).status).toBe(400);
});
test('API rejects forged placement, field/key/origin and oversized bodies without saving', async () => {
  for (const layout of [
    { ...tower, bricks: [b(1, { y: 3 })] },
    { ...tower, bricks: [b(1), b(2)] },
    { ...tower, bricks: [b(1, { x: 32 })] },
    { ...tower, extra: true },
  ])
    expect((await save(layout)).status).toBe(400);
  expect(
    (
      await request(app)
        .post('/api/bricks/designs')
        .set('Origin', config.webOrigin)
        .send({ layout: tower })
    ).status,
  ).toBe(400);
  expect(
    (
      await request(app)
        .post('/api/bricks/designs')
        .set('Origin', 'https://outside.invalid')
        .send({ layout: tower })
    ).status,
  ).toBe(403);
  const large = await save({ ...tower, title: 'x'.repeat(40000) });
  expect(large.status).toBe(413);
  expect(large.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  for (const key of keys)
    expect(
      Number(
        (await pool.query('SELECT count(*) FROM brick_designs WHERE idempotency_key=$1', [key]))
          .rows[0].count,
      ),
    ).toBeLessThanOrEqual(1);
});
test('save rate limit returns429, while catalog and Room Studio remain available', async () => {
  let limited = false;
  for (let i = 0; i < 31; i++) {
    const res = await request(app)
      .post('/api/bricks/designs')
      .set('Origin', config.webOrigin)
      .send({ layout: null });
    if (res.status === 429) {
      expect(res.body.error.code).toBe('RATE_LIMIT');
      limited = true;
      break;
    }
  }
  expect(limited).toBe(true);
  expect((await request(app).get('/api/bricks/catalog')).status).toBe(200);
  expect((await request(app).get('/api/rooms/catalog')).status).toBe(200);
});
