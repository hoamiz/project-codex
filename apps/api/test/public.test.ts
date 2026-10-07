import { beforeAll, afterAll, test, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db.js';
import { migrate } from '../src/services/migrations.js';
import { seed } from '../src/services/seed.js';
beforeAll(async () => {
  await migrate(pool);
  await seed(pool);
});
afterAll(() => pool.end());
test('portfolio has exactly four working routes', async () => {
  const r = await request(app).get('/api/portfolio/projects');
  expect(r.status).toBe(200);
  expect(r.body.data.map((p: { slug: string }) => p.slug)).toEqual([
    'autohub',
    'memory-match',
    'admin',
    'room-studio',
  ]);
  expect(r.body.data.every((p: { url: string }) => p.url.startsWith('/projects/'))).toBe(true);
});
test('cars filters, sorts, pagination, validation and public visibility', async () => {
  const r = await request(app)
    .get('/api/cars')
    .query({ brand: 'Toyota', minPrice: 1000000000, sort: 'price_asc', pageSize: 1 });
  expect(r.status).toBe(200);
  expect(r.body.data).toHaveLength(1);
  expect(r.body.data[0].brand).toBe('Toyota');
  expect(r.body.data[0].priceVnd).toBeGreaterThanOrEqual(1e9);
  expect((await request(app).get('/api/cars').query({ search: 'no-such-car' })).body.data).toEqual(
    [],
  );
  expect((await request(app).get('/api/cars').query({ sort: 'DROP TABLE' })).status).toBe(400);
  expect((await request(app).get('/api/cars').query({ page: 0 })).status).toBe(400);
  expect(
    (await request(app).get('/api/cars').query({ status: 'all' })).body.data.some(
      (c: { status: string }) => c.status === 'archived',
    ),
  ).toBe(false);
});
test('detail, by-id comparison and missing/archived cars', async () => {
  const r = await request(app).get('/api/cars/toyota-camry');
  expect(r.status).toBe(200);
  expect(typeof r.body.data.priceVnd).toBe('number');
  expect(
    (await request(app).get('/api/cars/by-ids').query({ ids: r.body.data.id })).body.data[0].id,
  ).toBe(r.body.data.id);
  expect((await request(app).get('/api/cars/honda-crv')).status).toBe(404);
  expect((await request(app).get('/api/cars/missing')).status).toBe(404);
});
