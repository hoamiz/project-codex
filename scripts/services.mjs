import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { smoke } from './smoke.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const registry = `${root}/.local/services.json`;
const jobs = {
  api: {
    cwd: root,
    marker: `${root}/apps/api/src/server.ts`,
    args: [`${root}/node_modules/tsx/dist/cli.mjs`, 'watch', `${root}/apps/api/src/server.ts`],
    port: 4100,
  },
  web: {
    cwd: `${root}/apps/web`,
    marker: `${root}/node_modules/vite/bin/vite.js`,
    args: [
      `${root}/node_modules/vite/bin/vite.js`,
      '--host',
      '127.0.0.1',
      '--port',
      '5173',
      '--strictPort',
    ],
    port: 5173,
  },
};
let records = existsSync(registry) ? JSON.parse(readFileSync(registry, 'utf8')) : {};
/** /proc/cwd bị sandbox hạn chế; command tuyệt đối và thời điểm tạo process chống PID cũ bị tái sử dụng. */
function startTicks(pid) {
  return readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ').at(-1).split(' ')[19];
}
function owned(record) {
  try {
    return (
      startTicks(record.pid) === record.startTicks &&
      readFileSync(`/proc/${record.pid}/cmdline`, 'utf8').includes(record.marker)
    );
  } catch {
    return false;
  }
}
async function occupied(port) {
  return new Promise((resolve) => {
    const socket = net.connect(port, '127.0.0.1');
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const action = process.argv[2] || 'start';
if (action === 'stop') {
  for (const record of Object.values(records))
    if (owned(record)) process.kill(-record.pid, 'SIGTERM');
  for (let i = 0; i < 40 && Object.values(records).some(owned); i++) await delay(100);
  if (Object.values(records).some(owned))
    throw new Error('Owned services still stopping; registry preserved');
  rmSync(registry, { force: true });
  console.log('Stopped owned application services. PostgreSQL and data preserved.');
} else if (action === 'start') {
  const database = spawnSync('bash', ['scripts/local-db.sh'], { cwd: root, stdio: 'inherit' });
  if (database.status !== 0) throw new Error('Local database startup failed');
  mkdirSync(`${root}/.local/logs`, { recursive: true });
  for (const [name, job] of Object.entries(jobs)) {
    if (owned(records[name])) continue;
    if (await occupied(job.port))
      throw new Error(`Port ${job.port} is occupied by an unowned process; preserved`);
    const fd = openSync(`${root}/.local/logs/${name}.log`, 'a', 0o600);
    const child = spawn(process.execPath, job.args, {
      cwd: job.cwd,
      detached: true,
      stdio: ['ignore', fd, fd],
    });
    closeSync(fd);
    await new Promise((resolve, reject) => {
      child.once('spawn', resolve);
      child.once('error', reject);
    });
    child.unref();
    records[name] = { pid: child.pid, startTicks: startTicks(child.pid), marker: job.marker };
    writeFileSync(registry, JSON.stringify(records, null, 2), { mode: 0o600 });
  }
  const deadline = Date.now() + 30000;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      const r = await fetch('http://127.0.0.1:4100/api/health', {
        signal: AbortSignal.timeout(1500),
      });
      ready = r.ok && (await r.json()).data.status === 'ok' && (await occupied(5173));
      if (ready) break;
    } catch {
      /* Đợi startup trong giới hạn; lỗi chi tiết nằm trong log riêng. */
    }
    await delay(250);
  }
  if (!ready) throw new Error('Startup failed; inspect .local/logs/api.log and web.log');
  await smoke();
} else throw new Error('Use start or stop');
