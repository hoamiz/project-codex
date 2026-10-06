import { test, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db.js';
import { migrate } from '../src/services/migrations.js';
import { seed } from '../src/services/seed.js';
let carId: string;
const keys: string[] = [];
beforeAll(async () => {
  await migrate(pool);
  await seed(pool);
  carId = (await pool.query("SELECT id FROM cars WHERE slug='toyota-camry'")).rows[0].id;
});
afterAll(async () => {
  await pool.query('DELETE FROM leads WHERE idempotency_key=ANY($1)', [keys]);
  await pool.end();
});
const send = (key: string, body: object) =>
  request(app).post('/api/leads').set('Idempotency-Key', key).send(body);
test('valid lead persists, retry is idempotent, different payload conflicts', async () => {
  const key = randomUUID();
  keys.push(key);
  const body = { carId, type: 'consultation', name: 'Khách kiểm thử', phone: '0901234567' };
  const [a, b] = await Promise.all([send(key, body), send(key, body)]);
  expect([a.status, b.status].sort()).toEqual([200, 201]);
  expect(b.body.data.id).toBe(a.body.data.id);
  expect(
    (await pool.query('SELECT count(*) FROM leads WHERE idempotency_key=$1', [key])).rows[0].count,
  ).toBe('1');
  expect((await send(key, { ...body, name: 'Other customer' })).status).toBe(409);
});
test('same request returns stored result after car archive and scheduled time has passed', async () => {
  const key = randomUUID();
  keys.push(key);
  const fixture = (
    await pool.query(
      'INSERT INTO cars(slug,brand,model,year,price_vnd,mileage_km,fuel_type,transmission,seats,description,status,image_paths) SELECT $1,brand,model,year,price_vnd,mileage_km,fuel_type,transmission,seats,description,status,image_paths FROM cars WHERE id=$2 RETURNING id',
      [`retry-${randomUUID()}`, carId],
    )
  ).rows[0].id;
  const now = Date.now();
  const body = {
    carId: fixture,
    type: 'test_drive',
    name: 'Retry Fixture',
    phone: '0901234567',
    preferredAt: new Date(now + 86400000).toISOString(),
  };
  try {
    const created = await send(key, body);
    expect(created.status).toBe(201);
    await pool.query("UPDATE cars SET status='archived' WHERE id=$1", [fixture]);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 2 * 86400000);
    try {
      const retry = await send(key, body);
      expect(retry.status).toBe(200);
      expect(retry.body.data.id).toBe(created.body.data.id);
      expect((await send(randomUUID(), body)).status).toBe(400);
    } finally {
      clock.mockRestore();
    }
    expect(
      (await send(randomUUID(), { ...body, type: 'consultation', preferredAt: undefined })).status,
    ).toBe(409);
  } finally {
    await pool.query('DELETE FROM leads WHERE car_id=$1', [fixture]);
    await pool.query('DELETE FROM cars WHERE id=$1', [fixture]);
  }
});
test('invalid contact and test drive dates return field errors; customer info is private', async () => {
  const key = randomUUID();
  keys.push(key);
  const a = await send(key, {
    carId,
    type: 'test_drive',
    name: 'K',
    phone: 'x',
    preferredAt: '2020-01-01T00:00:00Z',
  });
  expect(a.status).toBe(400);
  expect(a.body.error.fields.preferredAt).toBeDefined();
  expect(a.body.error.fields.phone).toBeDefined();
  expect((await request(app).get('/api/leads')).status).toBe(404);
});
