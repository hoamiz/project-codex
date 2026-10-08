import { chromium } from '@playwright/test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });
/** Kiểm tra cả JSON từ DB và giao diện đã render; không coi cổng mở là sẵn sàng. */
export async function smoke(
  apiOrigin = 'http://127.0.0.1:4100',
  webOrigin = 'http://127.0.0.1:5173',
) {
  for (const origin of [apiOrigin, webOrigin]) {
    const url = new URL(origin);
    assert(['127.0.0.1', 'localhost'].includes(url.hostname), 'Smoke only targets local services');
  }
  const json = async (path) => {
    const response = await fetch(`${apiOrigin}/api${path}`, { signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200, path);
    return response.json();
  };
  assert.equal((await json('/health')).data.status, 'ok');
  assert.deepEqual((await json('/portfolio/projects')).data.map((p) => p.slug).sort(), [
    'admin',
    'autohub',
    'brick-playground',
    'memory-match',
    'room-studio',
  ]);
  const cars = await json('/cars');
  assert(Array.isArray(cars.data));
  if (cars.data[0]) {
    const car = cars.data[0];
    assert.equal((await json(`/cars/${car.slug}`)).data.id, car.id);
    assert.equal((await json(`/cars/by-ids?ids=${car.id}`)).data[0].id, car.id);
  }
  assert(Array.isArray((await json('/games/memory/leaderboard?difficulty=easy')).data));
  assert.equal((await json('/rooms/catalog')).data.items.length, 6);
  assert.equal((await json('/bricks/catalog')).data.kinds.length, 10);
  assert.equal((await fetch(`${apiOrigin}/api/admin/cars`)).status, 401);
  assert.equal((await fetch(`${apiOrigin}/api/missing`)).status, 404);
  const database = new URL(process.env.DATABASE_URL);
  assert(
    ['127.0.0.1', 'localhost'].includes(database.hostname) &&
      ['/project_codex_dev', '/project_codex_test'].includes(database.pathname),
    'Smoke fixture requires isolated local database',
  );
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  });
  const fixturePool = new pg.Pool({ connectionString: database.href });
  const fixtureKey = randomUUID();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    // Bản build có manifest để xác minh bundle 3D chỉ tải khi mở studio.
    const manifest =
      apiOrigin === webOrigin
        ? JSON.parse(
            await readFile(
              new URL('../apps/web/dist/.vite/manifest.json', import.meta.url),
              'utf8',
            ),
          )
        : null;
    const roomChunk = manifest ? '/' + manifest['src/features/room-studio/index.tsx'].file : null;
    const brickChunks = manifest
      ? [
          'src/features/brick-playground/index.tsx',
          'src/features/brick-playground/brick-scene.tsx',
        ].map((key) => '/' + manifest[key].file)
      : [];
    const threeChunks = manifest
      ? Object.values(manifest)
          .filter((entry) => entry.file.includes('OrbitControls-'))
          .map((entry) => '/' + entry.file)
      : [];
    const assets = new Set();
    page.on('request', (request) => assets.add(new URL(request.url()).pathname));
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(webOrigin);
    await page.locator('.project-card').last().waitFor();
    assert.equal(await page.locator('.project-card').count(), 5);
    if (roomChunk) assert(!assets.has(roomChunk), 'Portfolio must not load the 3D bundle');
    for (const chunk of [...brickChunks, ...threeChunks])
      assert(!assets.has(chunk), 'Portfolio must not load PJ5/Three bundle');
    for (const [route, heading] of [
      ['/projects/autohub', 'Chặng đường mới.'],
      ['/projects/memory-match', 'Chậm lại.'],
      ['/projects/admin/login', 'Đăng nhập quản trị.'],
      ['/projects/room-studio', 'Room Studio 3D'],
      ['/projects/rooms', 'Room Studio 3D'],
      ['/projects/brick-playground', 'Brick Playground'],
    ]) {
      await page.goto(webOrigin + route);
      await page.getByRole('heading').filter({ hasText: heading }).waitFor();
      if (route === '/projects/room-studio' || route === '/projects/rooms')
        await page.locator('.room-stage[data-ready="true"]').waitFor();
      if (route === '/projects/rooms')
        assert.equal(new URL(page.url()).pathname, '/projects/room-studio');
      if (route === '/projects/brick-playground')
        await page.locator('.brick-stage[data-ready="true"]').waitFor();
      await page.reload();
      await page.getByRole('heading').filter({ hasText: heading }).waitFor();
      if (route === '/projects/brick-playground')
        await page.locator('.brick-stage[data-ready="true"]').waitFor();
    }
    if (roomChunk) assert(assets.has(roomChunk), 'Studio loads its lazy 3D bundle');
    for (const chunk of brickChunks)
      assert(assets.has(chunk), 'PJ5 loads its lazy editor and renderer');
    // Chỉ fixture riêng theo UUID; snapshot người dùng không bị xóa và public API vẫn chỉ ghi mới/đọc.
    const saved = await fetch(`${apiOrigin}/api/bricks/designs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: webOrigin,
        'Idempotency-Key': fixtureKey,
      },
      body: JSON.stringify({
        layout: { schemaVersion: 1, title: 'Kiểm tra khởi động PJ5', bricks: [] },
      }),
    });
    assert.equal(saved.status, 201);
    const { data: snapshot } = await saved.json();
    assert.equal((await json(`/bricks/designs/${snapshot.id}`)).data.title, snapshot.title);
    await page.goto(`${webOrigin}/projects/brick-playground/view/${snapshot.id}`);
    await page.locator('.brick-stage[data-ready="true"]').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Lưu & chia sẻ', exact: true }).count(), 0);
    await page.reload();
    await page.locator('.brick-stage[data-ready="true"]').waitFor();
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    try {
      await fixturePool.query('DELETE FROM brick_designs WHERE idempotency_key=$1', [fixtureKey]);
    } finally {
      await fixturePool.end();
    }
  }
  console.log(
    'HTTP/DB, admin 401, five rendered demos, immutable PJ5 viewer, lazy bundles and direct reload verified.',
  );
}
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  await smoke(process.argv[2], process.argv[3]);
}
