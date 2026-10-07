import { beforeAll, afterAll, test, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { app } from '../src/app.js';
import { pool } from '../src/db.js';
import { config } from '../src/config.js';
import { migrate } from '../src/services/migrations.js';
import { roomLayoutSchema, starterRoom } from '../src/services/room.js';
const keys: string[] = [];
beforeAll(() => migrate(pool));
afterAll(async () => {
  await pool.query('DELETE FROM room_designs WHERE idempotency_key=ANY($1::uuid[])', [keys]);
  await pool.end();
});
function save(layout: unknown, key = randomUUID()) {
  keys.push(key);
  return request(app)
    .post('/api/rooms')
    .set('Origin', config.webOrigin)
    .set('Idempotency-Key', key)
    .send({ layout });
}

test('catalog and starter geometry match; invalid, overlapping and duplicate items are rejected', async () => {
  const catalog = await request(app).get('/api/rooms/catalog');
  expect(catalog.status).toBe(200);
  expect(catalog.body.data.items).toHaveLength(6);
  expect(roomLayoutSchema.safeParse(catalog.body.data.starter).success).toBe(true);
  expect((await save({ ...starterRoom, items: [{ ...starterRoom.items[0], x: 3 }] })).status).toBe(
    400,
  );
  expect(
    (
      await save({
        ...starterRoom,
        items: [
          starterRoom.items[0],
          { ...starterRoom.items[1], x: starterRoom.items[0].x, z: starterRoom.items[0].z },
        ],
      })
    ).status,
  ).toBe(400);
  expect(
    (await save({ ...starterRoom, items: [starterRoom.items[0], starterRoom.items[0]] })).status,
  ).toBe(400);
  expect(
    (await save({ ...starterRoom, items: [{ ...starterRoom.items[1], x: 1.1 }] })).status,
  ).toBe(400);
  expect(
    (await save({ ...starterRoom, items: [{ ...starterRoom.items[0], kind: 'unknown' }] })).status,
  ).toBe(400);
  expect((await save({ ...starterRoom, wallColor: 'url(javascript:alert(1))' })).status).toBe(400);
  expect(
    (
      await save({
        ...starterRoom,
        items: Array.from({ length: 25 }, () => ({ ...starterRoom.items[0], id: randomUUID() })),
      })
    ).status,
  ).toBe(400);
});

test('snapshot roundtrip uses PostgreSQL, readonly routes and safe title text', async () => {
  const layout = { ...starterRoom, title: '<img src=x onerror=alert(1)>' };
  const created = await save(layout);
  expect(created.status).toBe(201);
  const row = (
    await pool.query('SELECT layout FROM room_designs WHERE id=$1', [created.body.data.id])
  ).rows[0];
  expect(row.layout).toEqual(layout);
  const read = await request(app).get(`/api/rooms/${created.body.data.id}`);
  expect(read.body.data.layout).toEqual(layout);
  expect(
    (await request(app).patch(`/api/rooms/${created.body.data.id}`).send({ layout: starterRoom }))
      .status,
  ).toBe(404);
  expect((await request(app).get(`/api/rooms/${randomUUID()}`)).status).toBe(404);
  expect((await request(app).get('/api/rooms/not-an-id')).status).toBe(400);
  expect(
    (
      await request(app)
        .post('/api/rooms')
        .set('Origin', 'https://outside.invalid')
        .send({ layout })
    ).status,
  ).toBe(403);
});

test('concurrent retries create one snapshot; different payload conflicts without altering the original', async () => {
  const key = randomUUID();
  const [a, b] = await Promise.all([save(starterRoom, key), save(starterRoom, key)]);
  expect([a.status, b.status].sort()).toEqual([200, 201]);
  expect(a.body.data.id).toBe(b.body.data.id);
  expect(
    (await pool.query('SELECT count(*) FROM room_designs WHERE idempotency_key=$1', [key])).rows[0]
      .count,
  ).toBe('1');
  expect((await save({ ...starterRoom, title: 'Thiết kế khác' }, key)).status).toBe(409);
  expect((await request(app).get(`/api/rooms/${a.body.data.id}`)).body.data.layout.title).toBe(
    starterRoom.title,
  );
});
