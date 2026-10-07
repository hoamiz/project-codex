import { test, expect, afterAll } from 'vitest';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { migrate } from '../src/services/migrations.js';

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
afterAll(() => pool.end());
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Chỉ thu hồi process do test tạo; schema fixture riêng giữ nguyên dữ liệu test/dev khác. */
async function stop(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill('SIGTERM');
  await Promise.race([exited, delay(2000)]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL');
    await exited;
  }
}

test.each([false, true])(
  'startup upgrades a three-project database and preserves metadata (existing room: %s)',
  async (existingRoom) => {
    const schema = `portfolio_upgrade_${randomUUID().replaceAll('-', '')}`;
    const dir = await mkdtemp(`${tmpdir()}/project-codex-upgrade-`);
    const database = new URL(process.env.TEST_DATABASE_URL!);
    database.searchParams.set('options', `-c search_path=${schema}`);
    const isolated = new Pool({ connectionString: database.href });
    let child: ChildProcess | undefined;
    try {
      await pool.query(`CREATE SCHEMA "${schema}"`);
      for (const name of ['001_initial.sql', '002_room_studio.sql'])
        await copyFile(new URL(`../db/migrations/${name}`, import.meta.url), `${dir}/${name}`);
      await migrate(isolated, dir);
      for (const slug of ['autohub', 'memory-match', 'admin'])
        await isolated.query('INSERT INTO portfolio_projects VALUES($1,$2,$3,$4,$5,$6,$7)', [
          slug,
          `Tên đã chỉnh: ${slug}`,
          'Giữ summary',
          'Giữ description',
          ['React'],
          `/projects/${slug}`,
          '/images/car-1.svg',
        ]);
      if (existingRoom)
        await isolated.query('INSERT INTO portfolio_projects VALUES($1,$2,$3,$4,$5,$6,$7)', [
          'room-studio',
          'Phòng của tôi',
          'Summary đã chỉnh',
          'Description đã chỉnh',
          ['Three.js'],
          '/projects/room-studio',
          '/images/room-studio.svg',
        ]);
      const before = (await isolated.query('SELECT * FROM portfolio_projects ORDER BY slug')).rows;
      let stderr = '';
      child = spawn(
        process.execPath,
        [
          fileURLToPath(new URL('../../../node_modules/tsx/dist/cli.mjs', import.meta.url)),
          fileURLToPath(new URL('../src/server.ts', import.meta.url)),
        ],
        {
          cwd: fileURLToPath(new URL('../../..', import.meta.url)),
          env: { ...process.env, DATABASE_URL: database.href, PORT: '4112' },
          stdio: ['ignore', 'ignore', 'pipe'],
        },
      );
      child.stderr!.on('data', (data) => {
        stderr += String(data);
      });
      let ready = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        if (child.exitCode !== null) throw new Error(`Startup exited: ${stderr}`);
        try {
          ready = (
            await fetch('http://127.0.0.1:4112/api/health', { signal: AbortSignal.timeout(500) })
          ).ok;
          if (ready) break;
        } catch {
          /* Đợi chính server fixture khởi động, không chạy seed trong test này. */
        }
        await delay(100);
      }
      expect(ready).toBe(true);
      const { data } = await (await fetch('http://127.0.0.1:4112/api/portfolio/projects')).json();
      expect(data.map((project: { slug: string }) => project.slug)).toEqual([
        'autohub',
        'memory-match',
        'admin',
        'room-studio',
      ]);
      expect(data.find((project: { slug: string }) => project.slug === 'room-studio').url).toBe(
        '/projects/room-studio',
      );
      const after = (await isolated.query('SELECT * FROM portfolio_projects ORDER BY slug')).rows;
      for (const original of before)
        expect(after.find((row) => row.slug === original.slug)).toEqual(original);
      expect(
        (
          await isolated.query(
            "SELECT count(*) FROM schema_migrations WHERE name='003_room_portfolio.sql'",
          )
        ).rows[0].count,
      ).toBe('1');
      await migrate(isolated);
      expect(
        (await isolated.query("SELECT count(*) FROM portfolio_projects WHERE slug='room-studio'"))
          .rows[0].count,
      ).toBe('1');
    } finally {
      if (child) await stop(child);
      await isolated.end();
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await rm(dir, { recursive: true, force: true });
    }
  },
);
