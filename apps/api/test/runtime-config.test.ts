import { randomBytes } from 'node:crypto';
import { test, expect } from 'vitest';
import { readRuntimeConfig } from '../src/services/runtime-config.js';
const secret = randomBytes(48).toString('hex');
const development = {
  DATABASE_URL: 'postgresql://codex@127.0.0.1:55434/project_codex_dev',
  SESSION_SECRET: secret,
};
const production = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://fixture:fixture@db.example/neondb?sslmode=require',
  EXPECTED_DATABASE_NAME: 'neondb',
  WEB_ORIGIN: 'https://portfolio.example',
  SESSION_SECRET: secret,
  TRUST_PROXY: 'gateway',
  API_PROXY_SECRET: secret,
};
test('development remains isolated with loopback defaults and no proxy trust', () => {
  const config = readRuntimeConfig(development);
  expect(config.host).toBe('127.0.0.1');
  expect(config.port).toBe(4100);
  expect(config.databaseSsl).toBe(false);
  expect(config.trustProxy).toBe(false);
  expect(() =>
    readRuntimeConfig({ ...development, DATABASE_URL: 'postgresql://fixture@localhost/other' }),
  ).toThrow('database name');
});
test('production accepts explicitly scoped provider DB with verified TLS and bounded pool', () => {
  const config = readRuntimeConfig(production);
  expect(config.host).toBe('0.0.0.0');
  expect(config.databaseSsl).toEqual({ rejectUnauthorized: true });
  expect(config.poolMax).toBe(5);
  expect(config.databaseUrl).not.toContain('sslmode');
  expect(config.trustProxy).toBe(1);
});
test.each(['EXPECTED_DATABASE_NAME', 'SESSION_SECRET', 'WEB_ORIGIN', 'API_PROXY_SECRET'])(
  'production requires %s without exposing values',
  (name) => {
    expect(() => readRuntimeConfig({ ...production, [name]: '' })).toThrow(/Invalid or missing/);
  },
);
test('invalid port/origin/proxy/database authentication and insecure remote TLS fail closed', () => {
  for (const override of [
    { PORT: '0' },
    { PORT: '1.2' },
    { PORT: '70000' },
    { HOST: 'https://wrong' },
    { WEB_ORIGIN: 'https://portfolio.example/path' },
    { WEB_ORIGIN: 'http://portfolio.example' },
    { WEB_ORIGIN: 'https://user:password@portfolio.example' },
    { EXPECTED_DATABASE_NAME: 'other' },
    { SESSION_SECRET: 'short' },
    { TRUST_PROXY: 'true' },
    { DATABASE_URL: 'postgresql://db.example/neondb' },
    { DATABASE_SSL: 'disable' },
  ])
    expect(() => readRuntimeConfig({ ...production, ...override })).toThrow(/Invalid or missing/);
});
test('local compiled verification is opt-in and cannot allow remote HTTP', () => {
  expect(
    readRuntimeConfig({
      ...development,
      NODE_ENV: 'production',
      EXPECTED_DATABASE_NAME: 'project_codex_dev',
      WEB_ORIGIN: 'http://127.0.0.1:4111',
      ALLOW_LOCAL_HTTP: '1',
    }).production,
  ).toBe(true);
  expect(() =>
    readRuntimeConfig({
      ...production,
      WEB_ORIGIN: 'http://portfolio.example',
      ALLOW_LOCAL_HTTP: '1',
    }),
  ).toThrow('HTTPS');
});
