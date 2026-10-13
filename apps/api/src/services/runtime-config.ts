import { isIP } from 'node:net';

/** Chặn cấu hình mơ hồ trước khi listen; chỉ trả tên biến lỗi, không đưa URL/password vào exception. */
export function readRuntimeConfig(env: NodeJS.ProcessEnv) {
  const production = env.NODE_ENV === 'production';
  const invalid = (name: string): never => {
    throw new Error(`Invalid or missing ${name}`);
  };
  const integer = (name: string, fallback: number, min: number, max: number) => {
    const raw = env[name] || String(fallback);
    if (!/^\d+$/.test(raw)) invalid(name);
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < min || value > max) invalid(name);
    return value;
  };
  let database: URL;
  try {
    database = new URL(env.DATABASE_URL || '');
  } catch {
    invalid('DATABASE_URL');
  }
  if (!['postgres:', 'postgresql:'].includes(database!.protocol) || !database!.hostname)
    invalid('DATABASE_URL');
  const databaseName = decodeURIComponent(database!.pathname.slice(1));
  if (production) {
    if (!env.EXPECTED_DATABASE_NAME || databaseName !== env.EXPECTED_DATABASE_NAME)
      invalid('EXPECTED_DATABASE_NAME');
    if (!database!.username || !database!.password) {
      if (
        env.ALLOW_LOCAL_HTTP !== '1' ||
        !['localhost', '127.0.0.1', '[::1]'].includes(database!.hostname)
      )
        invalid('DATABASE_URL authentication');
    }
  } else if (!['project_codex_dev', 'project_codex_test'].includes(databaseName))
    invalid('DATABASE_URL database name');
  let origin: URL;
  try {
    origin = new URL(env.WEB_ORIGIN || (production ? '' : 'http://localhost:5173'));
  } catch {
    invalid('WEB_ORIGIN');
  }
  if (
    !['http:', 'https:'].includes(origin!.protocol) ||
    origin!.origin !== origin!.href.replace(/\/$/, '') ||
    origin!.username ||
    origin!.password
  )
    invalid('WEB_ORIGIN');
  const localOrigin = ['localhost', '127.0.0.1', '[::1]'].includes(origin!.hostname);
  if (production && origin!.protocol !== 'https:' && !(env.ALLOW_LOCAL_HTTP === '1' && localOrigin))
    invalid('WEB_ORIGIN HTTPS');
  if (
    production &&
    ['project_codex_dev', 'project_codex_test'].includes(databaseName) &&
    !(env.ALLOW_LOCAL_HTTP === '1' && localOrigin)
  )
    invalid('EXPECTED_DATABASE_NAME production');
  const sessionSecret = env.SESSION_SECRET || '';
  if (!sessionSecret.trim() || (production && sessionSecret.length < 32)) invalid('SESSION_SECRET');
  const host = env.HOST || (production ? '0.0.0.0' : '127.0.0.1');
  if (!isIP(host) && host !== 'localhost') invalid('HOST');
  const proxy = env.TRUST_PROXY || '';
  if (!['', 'loopback', 'gateway'].includes(proxy)) invalid('TRUST_PROXY');
  const proxySecret = proxy === 'gateway' ? env.API_PROXY_SECRET : undefined;
  if (proxy === 'gateway' && (!proxySecret || proxySecret.length < 32)) invalid('API_PROXY_SECRET');
  const localDatabase = ['localhost', '127.0.0.1', '[::1]'].includes(database!.hostname);
  const sslMode = env.DATABASE_SSL || (localDatabase ? 'disable' : 'verify-full');
  if (!['disable', 'verify-full'].includes(sslMode)) invalid('DATABASE_SSL');
  if (production && !localDatabase && sslMode === 'disable') invalid('DATABASE_SSL production');
  // pg-connection-string có thể ghi đè SSL options; bỏ tham số TLS rồi cấu hình verify-full một nơi duy nhất.
  for (const key of ['sslmode', 'ssl', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat'])
    database!.searchParams.delete(key);
  return {
    databaseUrl: database!.href,
    testDatabaseUrl: env.TEST_DATABASE_URL,
    host,
    port: integer('PORT', 4100, 1, 65535),
    webOrigin: origin!.origin,
    sessionSecret,
    production,
    trustProxy: proxy === 'gateway' ? 1 : proxy === 'loopback' ? 'loopback' : false,
    proxySecret,
    databaseSsl:
      sslMode === 'verify-full'
        ? {
            rejectUnauthorized: true,
            ...(env.DATABASE_CA_CERT ? { ca: env.DATABASE_CA_CERT } : {}),
          }
        : false,
    poolMax: integer('DATABASE_POOL_MAX', 5, 1, 30),
    shutdownTimeoutMs: integer('SHUTDOWN_TIMEOUT_MS', 10000, 1000, 30000),
  };
}
