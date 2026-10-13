import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createServer } from 'node:https';
import assert from 'node:assert/strict';
import { request } from '@playwright/test';
import { createApiProxy } from '../api/proxy.mjs';
import { smokeDeployment } from './smoke-deploy.mjs';

const id = randomUUID().slice(0, 8),
  network = `codex-verify-${id}`,
  db = `codex-db-${id}`,
  app = `codex-app-${id}`,
  image = `project-codex:verify-${id}`;
const dir = resolve(`.local/deploy/verify-${id}`);
mkdirSync(dir, { recursive: true, mode: 0o700 });
// Docker/buildx cần ghi cache; cloud HOME có thể read-only, chỉ dùng vùng local của project.
process.env.DOCKER_CONFIG ||= resolve('.local/docker');
mkdirSync(process.env.DOCKER_CONFIG, { recursive: true, mode: 0o700 });
const secret = randomBytes(48).toString('hex'),
  password = randomBytes(32).toString('hex'),
  adminPassword = randomBytes(32).toString('hex');
const owned = [];
let frontend, http;
const docker = (...args) => {
  try {
    return execFileSync('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (error) {
    throw new Error(
      `Docker ${args[0]} failed (${error.status}): ${error.stderr?.toString().slice(0, 1000) || 'command failed'}`,
    );
  }
};
const assertCommand = (cmd, args) => {
  const result = spawnSync(cmd, args, {
    stdio: cmd === 'openssl' ? ['ignore', 'ignore', 'pipe'] : 'inherit',
  });
  assert.equal(result.status, 0, `${cmd} failed`);
};
const port = (name, target) =>
  JSON.parse(docker('inspect', '--format', '{{json .NetworkSettings.Ports}}', name).toString())[
    `${target}/tcp`
  ][0].HostPort;
/** Kiểm tra image trên DB mới có TLS, proxy HTTPS/static độc lập và dump/restore riêng; chỉ thu hồi container/network do lượt này tạo. */
try {
  const buildArgs = ['build', '--tag', image];
  for (const name of ['HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY'])
    if (process.env[name]) buildArgs.push('--build-arg', name);
  if (process.env.NODE_EXTRA_CA_CERTS)
    buildArgs.push('--secret', `id=build_ca,src=${process.env.NODE_EXTRA_CA_CERTS}`);
  if (
    process.env.HTTPS_PROXY &&
    ['localhost', '127.0.0.1'].includes(new URL(process.env.HTTPS_PROXY).hostname)
  )
    buildArgs.push('--network=host');
  assertCommand('docker', [...buildArgs, '.']);
  docker('network', 'create', network);
  writeFileSync(
    join(dir, 'postgres.env'),
    `POSTGRES_USER=codex\nPOSTGRES_PASSWORD=${password}\nPOSTGRES_DB=project_codex_verify\n`,
    { mode: 0o600 },
  );
  assertCommand('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-sha256',
    '-nodes',
    '-days',
    '2',
    '-subj',
    '/CN=db',
    '-addext',
    'subjectAltName=DNS:db',
    '-keyout',
    join(dir, 'db.key'),
    '-out',
    join(dir, 'db.crt'),
  ]);
  docker(
    'create',
    '--name',
    db,
    '--network',
    network,
    '--network-alias',
    'db',
    '--env-file',
    join(dir, 'postgres.env'),
    '--entrypoint',
    'sh',
    'postgres:17',
    '-c',
    'chown postgres:postgres /tmp/db.key /tmp/db.crt && chmod 600 /tmp/db.key && exec docker-entrypoint.sh postgres -c ssl=on -c ssl_cert_file=/tmp/db.crt -c ssl_key_file=/tmp/db.key',
  );
  owned.push(db);
  docker('cp', join(dir, 'db.key'), `${db}:/tmp/db.key`);
  docker('cp', join(dir, 'db.crt'), `${db}:/tmp/db.crt`);
  docker('start', db);
  for (let i = 0; i < 60; i++) {
    try {
      docker('exec', db, 'pg_isready', '-U', 'codex', '-d', 'project_codex_verify');
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (i === 59) throw new Error('Fixture PostgreSQL not ready');
  }
  assertCommand('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-sha256',
    '-nodes',
    '-days',
    '2',
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:localhost,IP:127.0.0.1',
    '-keyout',
    join(dir, 'web.key'),
    '-out',
    join(dir, 'web.crt'),
  ]);
  let proxy;
  frontend = createServer(
    { key: readFileSync(join(dir, 'web.key')), cert: readFileSync(join(dir, 'web.crt')) },
    (req, res) => {
      if (req.url.startsWith('/api/')) {
        req.headers['x-vercel-forwarded-for'] = '127.0.0.1';
        void proxy(req, res);
        return;
      }
      const path = new URL(req.url, 'https://localhost').pathname;
      let file = resolve('apps/web/dist', '.' + path);
      if (file !== resolve('apps/web/dist') && !file.startsWith(resolve('apps/web/dist') + '/')) {
        res.statusCode = 400;
        res.end();
        return;
      }
      let body;
      try {
        body = readFileSync(file);
      } catch {
        if (
          path.startsWith('/assets/') ||
          path.startsWith('/images/') ||
          /\.[a-z0-9]+$/i.test(path)
        ) {
          res.statusCode = 404;
          res.end();
          return;
        }
        file = resolve('apps/web/dist/index.html');
        body = readFileSync(file);
      }
      const ext = file.split('.').at(-1);
      res.setHeader(
        'Content-Type',
        {
          html: 'text/html',
          js: 'text/javascript',
          css: 'text/css',
          svg: 'image/svg+xml',
          mp3: 'audio/mpeg',
          woff2: 'font/woff2',
          json: 'application/json',
        }[ext] || 'application/octet-stream',
      );
      res.end(body);
    },
  );
  await new Promise((resolve) => frontend.listen(0, '127.0.0.1', resolve));
  const origin = `https://127.0.0.1:${frontend.address().port}`;
  const env = {
    NODE_ENV: 'production',
    HOST: '0.0.0.0',
    PORT: '4100',
    DATABASE_URL: `postgresql://codex:${password}@db:5432/project_codex_verify`,
    EXPECTED_DATABASE_NAME: 'project_codex_verify',
    DATABASE_SSL: 'verify-full',
    WEB_ORIGIN: origin,
    SESSION_SECRET: randomBytes(48).toString('hex'),
    TRUST_PROXY: 'gateway',
    API_PROXY_SECRET: secret,
    ADMIN_EMAIL: 'fixture@project-codex.test',
    ADMIN_PASSWORD: adminPassword,
    INITIALIZE_DEMO: '1',
  };
  writeFileSync(
    join(dir, 'runtime.env'),
    Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n',
    { mode: 0o600 },
  );
  const caArgs = ['-e', `DATABASE_CA_CERT=${readFileSync(join(dir, 'db.crt'), 'utf8')}`];
  // CA public được truyền riêng vì env-file không hỗ trợ PEM nhiều dòng; password không nằm trên argv.
  const initialize = () =>
    docker(
      'run',
      '--rm',
      '--network',
      network,
      '--env-file',
      join(dir, 'runtime.env'),
      ...caArgs,
      image,
      'node',
      'apps/api/dist/scripts/initialize.js',
    );
  initialize();
  const fingerprint = () =>
    docker(
      'exec',
      db,
      'psql',
      '-U',
      'codex',
      '-d',
      'project_codex_verify',
      '-Atqc',
      "SELECT (SELECT count(*) FROM portfolio_projects)||'|'||(SELECT count(*) FROM cars)||'|'||(SELECT password_hash FROM admin_users LIMIT 1)",
    ).toString();
  const before = fingerprint();
  initialize();
  assert.equal(fingerprint(), before, 'Bootstrap must preserve existing password/data');
  assert(before.startsWith('6|12|'));
  // Chứng minh CA sai bị từ chối; không chuyển rejectUnauthorized=false để tiếp tục.
  const bad = spawnSync(
    'docker',
    [
      'run',
      '--rm',
      '--network',
      network,
      '--env-file',
      join(dir, 'runtime.env'),
      '-e',
      `DATABASE_CA_CERT=${readFileSync(join(dir, 'web.crt'), 'utf8')}`,
      image,
      'node',
      'apps/api/dist/scripts/initialize.js',
    ],
    { encoding: 'utf8' },
  );
  assert.notEqual(bad.status, 0, 'Wrong CA must fail');
  docker(
    'create',
    '--name',
    app,
    '--network',
    network,
    '--env-file',
    join(dir, 'runtime.env'),
    ...caArgs,
    '-p',
    '127.0.0.1::4100',
    image,
  );
  owned.push(app);
  docker('start', app);
  let backend = `http://127.0.0.1:${port(app, 4100)}`;
  proxy = createApiProxy({ origin: backend, secret, timeoutMs: 45000, local: true });
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(backend + '/api/health')).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (i === 79) throw new Error('Container API not ready');
  }
  assert.equal(
    (await fetch(backend + '/api/portfolio/projects')).status,
    403,
    'Direct request cannot bypass Vercel gateway',
  );
  assert.equal(
    docker(
      'exec',
      app,
      'node',
      '-e',
      "console.log(require('node:fs').readFileSync('/proc/1/environ','utf8').split('\\0').some(v=>v.startsWith('ADMIN_PASSWORD=')))",
    )
      .toString()
      .trim(),
    'false',
    'API process must not keep bootstrap password',
  );
  http = await request.newContext({ baseURL: origin, ignoreHTTPSErrors: true });
  const login = await http.post('/api/auth/login', {
    headers: { Origin: origin },
    data: { email: env.ADMIN_EMAIL, password: adminPassword },
  });
  assert.equal(login.status(), 200);
  const cookies = login
    .headersArray()
    .filter((header) => header.name.toLowerCase() === 'set-cookie');
  assert(
    cookies.some(
      (cookie) =>
        /Secure/.test(cookie.value) &&
        /HttpOnly/.test(cookie.value) &&
        /SameSite=Lax/.test(cookie.value),
    ),
  );
  const csrf = (await login.json()).data.csrfToken;
  const layout = (await (await http.get('/api/rooms/catalog')).json()).data.starter;
  const room = await http.post('/api/rooms', {
    headers: { Origin: origin, 'Idempotency-Key': randomUUID() },
    data: { layout },
  });
  assert.equal(room.status(), 201);
  const roomId = (await room.json()).data.id;
  const brick = await http.post('/api/bricks/designs', {
    headers: { Origin: origin, 'Idempotency-Key': randomUUID() },
    data: { layout: { schemaVersion: 1, title: 'Công trình nghiệm thu', bricks: [] } },
  });
  assert.equal(brick.status(), 201);
  const brickId = (await brick.json()).data.id;
  await smokeDeployment(origin, { tlsFixture: true, roomId, brickId });
  docker('restart', app);
  // Docker có thể cấp lại host port khi publish :0; domain frontend/cookie vẫn giữ nguyên.
  backend = `http://127.0.0.1:${port(app, 4100)}`;
  proxy = createApiProxy({ origin: backend, secret, timeoutMs: 45000, local: true });
  let restarted = false;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(backend + '/api/health')).ok) {
        restarted = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(restarted, 'Restarted API readiness');
  assert.equal((await http.get('/api/auth/me')).status(), 200, 'Session survives API restart');
  assert.equal((await http.get(`/api/bricks/designs/${brickId}`)).status(), 200);
  assert.equal(
    (
      await http.post('/api/auth/logout', { headers: { Origin: origin, 'X-CSRF-Token': csrf } })
    ).status(),
    200,
  );
  const archive = docker('exec', db, 'pg_dump', '-U', 'codex', '-d', 'project_codex_verify', '-Fc');
  writeFileSync(join(dir, 'backup.dump'), archive, { mode: 0o600 });
  docker('exec', db, 'createdb', '-U', 'codex', 'project_codex_restore');
  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      db,
      'pg_restore',
      '-U',
      'codex',
      '--exit-on-error',
      '-d',
      'project_codex_restore',
    ],
    { input: archive, stdio: ['pipe', 'pipe', 'pipe'] },
  );
  const sql =
    "SELECT (SELECT count(*) FROM portfolio_projects)||'|'||(SELECT count(*) FROM cars)||'|'||(SELECT count(*) FROM room_designs)||'|'||(SELECT count(*) FROM brick_designs)||'|'||(SELECT count(*) FROM schema_migrations)";
  const counts = (name) =>
    docker('exec', db, 'psql', '-U', 'codex', '-d', name, '-Atqc', sql).toString().trim();
  assert.equal(counts('project_codex_restore'), counts('project_codex_verify'));
  assert.equal(counts('project_codex_restore'), '6|12|1|1|5');
  for (const table of [
    'schema_migrations',
    'portfolio_projects',
    'cars',
    'admin_users',
    'room_designs',
    'brick_designs',
  ]) {
    const digest = (name) =>
      docker(
        'exec',
        db,
        'psql',
        '-U',
        'codex',
        '-d',
        name,
        '-Atqc',
        `SELECT md5(COALESCE(string_agg(row_to_json(t)::text,'|' ORDER BY row_to_json(t)::text),'')) FROM ${table} t`,
      )
        .toString()
        .trim();
    assert.equal(
      digest('project_codex_restore'),
      digest('project_codex_verify'),
      `Restored rows differ: ${table}`,
    );
  }
  console.log(
    'Container verified: non-root Node24, TLS/invalid CA, compiled initialization twice, gateway/HTTPS cookie, six demos/viewers, session/snapshot restart, isolated dump/restore.',
  );
} finally {
  if (http) await http.dispose();
  if (frontend) {
    frontend.closeAllConnections();
    await new Promise((resolve) => frontend.close(resolve));
  }
  for (const name of owned.reverse()) {
    try {
      docker('rm', '-f', '-v', name);
    } catch {}
  }
  try {
    docker('network', 'rm', network);
  } catch {}
  try {
    docker('image', 'rm', image);
  } catch {}
  // Không giữ credential/key fixture sau kiểm tra; backup dump vẫn chỉ ở .local bị Git bỏ qua.
  for (const name of ['runtime.env', 'postgres.env', 'db.key', 'web.key'])
    rmSync(join(dir, name), { force: true });
}
