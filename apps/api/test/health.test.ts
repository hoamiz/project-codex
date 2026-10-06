import { test, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db.js';
afterAll(() => pool.end());
test('health queries PostgreSQL and unknown routes return 404', async () => {
  expect((await request(app).get('/api/health')).body.data.status).toBe('ok');
  expect((await request(app).get('/api/missing')).status).toBe(404);
});
