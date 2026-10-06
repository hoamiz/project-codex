import { test, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db.js';
import { migrate } from '../src/services/migrations.js';
import { seed } from '../src/services/seed.js';
import { hashPassword } from '../src/services/password.js';
const origin = 'http://localhost:5173';
const email = process.env.ADMIN_EMAIL!,
  password = process.env.ADMIN_PASSWORD!;
let csrf = '';
const agent = request.agent(app);
const created: string[] = [];
const leadKeys: string[] = [];
beforeAll(async () => {
  await migrate(pool);
  await seed(pool);
  await pool.query(
    'INSERT INTO admin_users(email,password_hash) VALUES($1,$2) ON CONFLICT DO NOTHING',
    [email, await hashPassword(password)],
  );
  const r = await agent.post('/api/auth/login').set('Origin', origin).send({ email, password });
  expect(r.status).toBe(200);
  csrf = r.body.data.csrfToken;
});
afterAll(async () => {
  await pool.query('DELETE FROM leads WHERE idempotency_key=ANY($1)', [leadKeys]);
  await pool.query('DELETE FROM cars WHERE id=ANY($1::uuid[])', [created]);
  await pool.end();
});
test('login errors, cookie attributes, CSRF and origin checks', async () => {
  expect((await request(app).get('/api/admin/cars')).status).toBe(401);
  expect(
    (
      await request(app)
        .post('/api/auth/login')
        .set('Origin', origin)
        .send({ email, password: 'wrong' })
    ).status,
  ).toBe(401);
  const r = await request(app)
    .post('/api/auth/login')
    .set('Origin', origin)
    .send({ email, password });
  const cookie = String(r.headers['set-cookie']);
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('SameSite=Lax');
  expect((await agent.post('/api/admin/cars').set('Origin', origin).send({})).status).toBe(403);
  expect(
    (
      await agent
        .post('/api/admin/cars')
        .set('Origin', 'https://attacker.example')
        .set('X-CSRF-Token', csrf)
        .send({})
    ).status,
  ).toBe(403);
});
const carBody = {
  slug: `fixture-${randomUUID()}`,
  brand: 'Fixture',
  model: 'Test car',
  year: 2024,
  priceVnd: 850000000,
  mileageKm: 5000,
  fuelType: 'petrol',
  transmission: 'automatic',
  seats: 5,
  description: 'Xe dành riêng cho kiểm thử tích hợp.',
  status: 'available',
  imagePaths: ['/images/car-1.svg'],
};
test('admin creates/updates/archives car, handles stale version and preserves leads', async () => {
  const create = await agent
    .post('/api/admin/cars')
    .set('Origin', origin)
    .set('X-CSRF-Token', csrf)
    .send(carBody);
  expect(create.status).toBe(201);
  const car = create.body.data;
  created.push(car.id);
  const key = randomUUID();
  leadKeys.push(key);
  expect(
    (
      await request(app).post('/api/leads').set('Idempotency-Key', key).send({
        carId: car.id,
        type: 'consultation',
        name: 'Fixture Customer',
        phone: '0909998888',
      })
    ).status,
  ).toBe(201);
  const next = { ...carBody, priceVnd: 900000000, version: car.version };
  const update = await agent
    .patch(`/api/admin/cars/${car.id}`)
    .set('Origin', origin)
    .set('X-CSRF-Token', csrf)
    .send(next);
  expect(update.body.data.priceVnd).toBe(900000000);
  expect(
    (
      await agent
        .patch(`/api/admin/cars/${car.id}`)
        .set('Origin', origin)
        .set('X-CSRF-Token', csrf)
        .send(next)
    ).status,
  ).toBe(409);
  expect(
    (
      await agent
        .delete(`/api/admin/cars/${car.id}`)
        .set('Origin', origin)
        .set('X-CSRF-Token', csrf)
        .send({ version: update.body.data.version })
    ).status,
  ).toBe(200);
  expect((await request(app).get(`/api/cars/${car.slug}`)).status).toBe(404);
  expect(
    (await pool.query('SELECT count(*) FROM leads WHERE car_id=$1', [car.id])).rows[0].count,
  ).toBe('1');
});
test('leads filter/update and dashboard include zero days with UTC+7 buckets', async () => {
  const key = randomUUID();
  leadKeys.push(key);
  const car = (await pool.query("SELECT id FROM cars WHERE slug='toyota-camry'")).rows[0];
  const r = await request(app)
    .post('/api/leads')
    .set('Idempotency-Key', key)
    .send({
      carId: car.id,
      type: 'test_drive',
      name: 'Time Boundary',
      phone: '0901239876',
      preferredAt: new Date(Date.now() + 86400000).toISOString(),
    });
  expect(r.status).toBe(201);
  // 23:30 UTC là ngày kế tiếp ở Việt Nam: fixture phải được đếm trong đúng bucket.
  await pool.query(
    "UPDATE leads SET created_at=((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date-1)::timestamp AT TIME ZONE 'UTC' + interval '23 hours 30 minutes' WHERE id=$1",
    [r.body.data.id],
  );
  const list = await agent
    .get('/api/admin/leads')
    .query({ search: 'Time Boundary', type: 'test_drive' });
  expect(list.body.data).toHaveLength(1);
  const lead = list.body.data[0];
  const update = await agent
    .patch(`/api/admin/leads/${lead.id}`)
    .set('Origin', origin)
    .set('X-CSRF-Token', csrf)
    .send({ status: 'completed', version: lead.version });
  expect(update.status).toBe(200);
  expect(
    (
      await agent
        .patch(`/api/admin/leads/${lead.id}`)
        .set('Origin', origin)
        .set('X-CSRF-Token', csrf)
        .send({ status: 'new', version: lead.version })
    ).status,
  ).toBe(409);
  expect((await agent.get(`/api/admin/leads/${lead.id}`)).body.data.phone).toBe('0901239876');
  const stats = await agent.get('/api/admin/stats');
  expect(stats.body.data.testDrives).toHaveLength(7);
  expect(stats.body.data.timeZone).toBe('Asia/Ho_Chi_Minh');
  expect(stats.body.data.testDrives.at(-1).count).toBeGreaterThanOrEqual(1);
  expect(stats.body.data.testDrives.every((d: { count: number }) => d.count >= 0)).toBe(true);
});
test('logout and expired session remove authorization; repeated login rotates session', async () => {
  const x = request.agent(app);
  const first = await x.post('/api/auth/login').set('Origin', origin).send({ email, password });
  const second = await x.post('/api/auth/login').set('Origin', origin).send({ email, password });
  expect(first.headers['set-cookie'][0]).not.toEqual(second.headers['set-cookie'][0]);
  expect(
    (
      await x
        .post('/api/auth/logout')
        .set('Origin', origin)
        .set('X-CSRF-Token', second.body.data.csrfToken)
    ).status,
  ).toBe(200);
  expect((await x.get('/api/auth/me')).status).toBe(401);
  const exp = request.agent(app);
  const login = await exp.post('/api/auth/login').set('Origin', origin).send({ email, password });
  const sid = decodeURIComponent(login.headers['set-cookie'][0].split(';')[0].split('=')[1])
    .slice(2)
    .split('.')[0];
  await pool.query("UPDATE auth_sessions SET expire='2000-01-01' WHERE sid=$1", [sid]);
  expect((await exp.get('/api/auth/me')).status).toBe(401);
});
