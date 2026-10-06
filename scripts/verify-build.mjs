import { spawn } from 'node:child_process';
import { strict as assert } from 'node:assert';
import { openSync, closeSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import net from 'node:net';
import { smoke } from './smoke.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });
const busy = await new Promise((resolve) => {
  const socket = net.connect(4111, '127.0.0.1');
  socket.once('connect', () => {
    socket.destroy();
    resolve(true);
  });
  socket.once('error', () => {
    socket.destroy();
    resolve(false);
  });
});
assert(!busy, 'Build verification port 4111 is already occupied; existing service preserved');
mkdirSync(new URL('../.local/logs', import.meta.url), { recursive: true });
// Bind cổng tạm riêng và luôn thu hồi đúng process đã tạo; không đụng dịch vụ dev.
const fd = openSync(new URL('../.local/logs/build-server.log', import.meta.url), 'a', 0o600);
const child = spawn(process.execPath, ['apps/api/dist/server.js'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: '4111',
    NODE_ENV: 'production',
    WEB_ORIGIN: 'http://127.0.0.1:4111',
    TRUST_PROXY: 'loopback',
  },
  stdio: ['ignore', fd, fd],
});
closeSync(fd);
let spawned = false;
try {
  await new Promise((resolve, reject) => {
    child.once('spawn', () => {
      spawned = true;
      resolve();
    });
    child.once('error', reject);
  });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null)
      throw new Error('Build server exited; inspect .local/logs/build-server.log');
    try {
      ready = (
        await fetch('http://127.0.0.1:4111/api/health', { signal: AbortSignal.timeout(1000) })
      ).ok;
      if (ready) break;
    } catch {
      /* Đợi compiled server sẵn sàng. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(ready, 'Built server readiness');
  await smoke('http://127.0.0.1:4111', 'http://127.0.0.1:4111');
  assert.equal((await fetch('http://127.0.0.1:4111/assets/missing.js')).status, 404);
  assert.equal(
    (await fetch('http://127.0.0.1:4111/projects/autohub/cars/toyota-camry')).status,
    200,
  );
  const auth = await fetch('http://127.0.0.1:4111/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://127.0.0.1:4111',
      'X-Forwarded-Proto': 'https',
    },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
  });
  assert.equal(auth.status, 200, 'Production login behind simulated HTTPS proxy');
  const cookies = auth.headers.getSetCookie();
  assert(
    cookies.some(
      (c) => c.includes('HttpOnly') && c.includes('Secure') && c.includes('SameSite=Lax'),
    ),
    'Production cookie attributes',
  );
  const token = (await auth.json()).data.csrfToken;
  const logout = await fetch('http://127.0.0.1:4111/api/auth/logout', {
    method: 'POST',
    headers: {
      Origin: 'http://127.0.0.1:4111',
      'X-Forwarded-Proto': 'https',
      'X-CSRF-Token': token,
      Cookie: cookies.map((c) => c.split(';')[0]).join('; '),
    },
  });
  assert.equal(logout.status, 200, 'Production logout');
  console.log('Compiled API + React SPA fallback and missing asset 404 verified.');
} finally {
  if (spawned && child.exitCode === null) {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
  }
}
