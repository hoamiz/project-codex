import { chromium } from '@playwright/test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
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
  assert.equal((await fetch(`${apiOrigin}/api/admin/cars`)).status, 401);
  assert.equal((await fetch(`${apiOrigin}/api/missing`)).status, 404);
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    // Bản build có manifest để xác minh bundle 3D chỉ tải khi mở studio.
    const roomChunk =
      apiOrigin === webOrigin
        ? '/' +
          JSON.parse(
            await readFile(
              new URL('../apps/web/dist/.vite/manifest.json', import.meta.url),
              'utf8',
            ),
          )['src/features/room-studio/index.tsx'].file
        : null;
    const assets = new Set();
    page.on('request', (request) => assets.add(new URL(request.url()).pathname));
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(webOrigin);
    await page.locator('.project-card').last().waitFor();
    assert.equal(await page.locator('.project-card').count(), 4);
    if (roomChunk) assert(!assets.has(roomChunk), 'Portfolio must not load the 3D bundle');
    for (const [route, heading] of [
      ['/projects/autohub', 'Chặng đường mới.'],
      ['/projects/memory-match', 'Chậm lại.'],
      ['/projects/admin/login', 'Đăng nhập quản trị.'],
      ['/projects/room-studio', 'Room Studio 3D'],
      ['/projects/rooms', 'Room Studio 3D'],
    ]) {
      await page.goto(webOrigin + route);
      await page.getByRole('heading').filter({ hasText: heading }).waitFor();
      if (route === '/projects/room-studio' || route === '/projects/rooms')
        await page.locator('.room-stage[data-ready="true"]').waitFor();
      if (route === '/projects/rooms')
        assert.equal(new URL(page.url()).pathname, '/projects/room-studio');
      await page.reload();
      await page.getByRole('heading').filter({ hasText: heading }).waitFor();
    }
    if (roomChunk) assert(assets.has(roomChunk), 'Studio loads its lazy 3D bundle');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
  console.log('HTTP/DB, admin 401, four rendered demos and direct URL reload verified.');
}
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  await smoke(process.argv[2], process.argv[3]);
}
