import { chromium, request } from '@playwright/test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

/** Smoke public chỉ đọc qua frontend HTTPS; exception certificate chỉ dành fixture loopback tự ký, không dùng với hosting thật. */
export async function smokeDeployment(base, { tlsFixture = false, roomId, brickId } = {}) {
  const origin = new URL(base);
  const local = ['localhost', '127.0.0.1'].includes(origin.hostname);
  assert(
    !origin.username &&
      !origin.password &&
      origin.pathname === '/' &&
      !origin.search &&
      !origin.hash,
    'Supply a canonical origin',
  );
  assert(
    origin.protocol === 'https:' || (origin.protocol === 'http:' && local),
    'HTTPS required for public smoke',
  );
  assert(!tlsFixture || local, 'TLS fixture must be loopback');
  const http = await request.newContext({
    baseURL: origin.origin,
    ignoreHTTPSErrors: tlsFixture,
    timeout: 10000,
  });
  let browser;
  try {
    const json = async (path) => {
      const response = await http.get(`/api${path}`);
      assert.equal(response.status(), 200, path);
      assert.match(response.headers()['content-type'] || '', /application\/json/);
      return response.json();
    };
    assert.equal((await json('/health')).data.status, 'ok');
    assert.deepEqual(
      (await json('/portfolio/projects')).data.map((p) => p.slug),
      [
        'autohub',
        'memory-match',
        'admin',
        'room-studio',
        'brick-playground',
        'vietnamese-alphabet',
      ],
    );
    assert(Array.isArray((await json('/cars')).data));
    assert(Array.isArray((await json('/games/memory/leaderboard?difficulty=easy')).data));
    assert.equal((await json('/rooms/catalog')).data.items.length, 6);
    assert.equal((await json('/bricks/catalog')).data.kinds.length, 10);
    assert.equal((await http.get('/api/admin/cars')).status(), 401);
    assert.equal((await http.get('/api/missing')).status(), 404);
    assert.equal((await http.get('/assets/missing.js')).status(), 404);
    assert.equal((await http.get('/audio/vietnamese-alphabet/missing.mp3')).status(), 404);
    const voice = await http.get('/audio/vietnamese-alphabet/a.mp3');
    assert.equal(voice.status(), 200);
    assert.match(voice.headers()['content-type'], /audio\/mpeg/);
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    });
    const context = await browser.newContext({ ignoreHTTPSErrors: tlsFixture });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(origin.origin);
    await page.locator('.project-card').last().waitFor();
    assert.equal(await page.locator('.project-card').count(), 6);
    for (const [path, heading] of [
      ['/projects/autohub', 'Chặng đường mới.'],
      ['/projects/memory-match', 'Chậm lại.'],
      ['/projects/admin/login', 'Đăng nhập quản trị.'],
      ['/projects/rooms', 'Room Studio 3D'],
      ['/projects/brick-playground', 'Brick Playground'],
      ['/projects/vietnamese-alphabet', 'Chữ nhỏ.'],
    ]) {
      await page.goto(origin.origin + path);
      await page.getByRole('heading').filter({ hasText: heading }).waitFor();
      if (path === '/projects/rooms') {
        assert.equal(new URL(page.url()).pathname, '/projects/room-studio');
        await page.locator('.room-stage[data-ready="true"]').waitFor();
      }
      if (path === '/projects/brick-playground')
        await page.locator('.brick-stage[data-ready="true"]').waitFor();
      await page.reload();
      await page.getByRole('heading').filter({ hasText: heading }).waitFor();
    }
    for (const [kind, id] of [
      ['room-studio', roomId],
      ['brick-playground', brickId],
    ])
      if (id) {
        assert.match(id, /^[0-9a-f-]{36}$/i);
        await page.goto(`${origin.origin}/projects/${kind}/view/${id}`);
        await page
          .locator(
            kind === 'room-studio'
              ? '.room-stage[data-ready="true"]'
              : '.brick-stage[data-ready="true"]',
          )
          .waitFor();
        assert.equal(
          await page.getByRole('button', { name: 'Lưu & chia sẻ', exact: true }).count(),
          0,
        );
        await page.reload();
        await page
          .locator(
            kind === 'room-studio'
              ? '.room-stage[data-ready="true"]'
              : '.brick-stage[data-ready="true"]',
          )
          .waitFor();
      }
    assert.deepEqual(errors, []);
    console.log(
      `Deployment read-only smoke passed: six demos, Vietnamese audio, alias, direct/reload, DB-backed health and API/assets404; viewers ${roomId && brickId ? 'verified' : 'not supplied'}.`,
    );
  } finally {
    if (browser) await browser.close();
    await http.dispose();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2])
    throw new Error('Usage: npm run smoke:deploy -- https://your-frontend.vercel.app');
  await smokeDeployment(process.argv[2], {
    roomId: process.env.ROOM_SNAPSHOT_ID,
    brickId: process.env.BRICK_SNAPSHOT_ID,
  });
}
