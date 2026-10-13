import express from 'express';
import request from 'supertest';
import { test, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { proxyBoundary } from '../src/services/proxy-boundary.js';
import { errorHandler } from '../src/errors.js';
const secret = randomBytes(48).toString('hex');
const app = express();
app.set('trust proxy', 1);
app.use(proxyBoundary(secret));
app.get('/', (req, res) =>
  res.json({ ip: req.ip, secure: req.secure, secret: req.get('X-Codex-Proxy-Token') }),
);
app.use(errorHandler);
test('direct requests cannot spoof gateway/IP with missing or wrong secret', async () => {
  for (const token of ['', 'wrong'])
    expect(
      (
        await request(app)
          .get('/')
          .set('X-Codex-Proxy-Token', token)
          .set('X-Codex-Client-IP', '198.51.100.8')
          .set('X-Forwarded-Proto', 'https')
      ).status,
    ).toBe(403);
});
test('authenticated gateway replaces malicious forwarded headers and removes token', async () => {
  const response = await request(app)
    .get('/')
    .set('X-Codex-Proxy-Token', secret)
    .set('X-Codex-Client-IP', '198.51.100.8')
    .set('X-Forwarded-For', 'attacker, 203.0.113.8')
    .set('X-Forwarded-Proto', 'http');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ ip: '198.51.100.8', secure: true });
  expect(
    (
      await request(app)
        .get('/')
        .set('X-Codex-Proxy-Token', secret)
        .set('X-Codex-Client-IP', 'fake')
    ).status,
  ).toBe(403);
});
