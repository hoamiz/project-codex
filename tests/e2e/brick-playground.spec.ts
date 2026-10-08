import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fixtureBrick, catalog } from '../../apps/web/src/features/brick-playground/brick-fixture';
import {
  DRAFT_KEY,
  type BrickLayout,
} from '../../apps/web/src/features/brick-playground/brick-core';
import { OrthographicCamera, Vector3 } from 'three';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
const keys: string[] = [];
test.afterAll(async () => {
  await pool.query('DELETE FROM brick_designs WHERE idempotency_key=ANY($1::uuid[])', [keys]);
  await pool.end();
});
async function draft(page: Page): Promise<BrickLayout> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), DRAFT_KEY);
}
async function open(page: Page) {
  await page.goto('/projects/brick-playground');
  await expect(page.locator('.brick-stage')).toHaveAttribute('data-ready', 'true');
}
async function project(page: Page, x: number, y: number, z: number) {
  await page.locator('.brick-canvas').scrollIntoViewIfNeeded();
  const box = (await page.locator('.brick-canvas canvas').boundingBox())!;
  const camera = new OrthographicCamera(
    -box.width / 2,
    box.width / 2,
    box.height / 2,
    -box.height / 2,
    0.1,
    250,
  );
  camera.position.set(38, 36, 44);
  camera.lookAt(0, 0.9, 0);
  camera.zoom = Math.min(box.width / 50, box.height / 42);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const point = new Vector3(x - 16, y, z - 16).project(camera);
  return {
    x: box.x + ((point.x + 1) * box.width) / 2,
    y: box.y + ((1 - point.y) * box.height) / 2,
  };
}
async function dragBetween(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  cancel?: 'escape' | 'pointercancel',
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  if (cancel === 'escape') await page.keyboard.press('Escape');
  if (cancel === 'pointercancel')
    await page
      .locator('.brick-canvas canvas')
      .dispatchEvent('pointercancel', { bubbles: true, pointerId: 1 });
  await page.mouse.up();
}
async function scan(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
}
test('fifth portfolio card opens the real editor and Back restores all five cards', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.project-card')).toHaveCount(5);
  const card = page.locator('.project-brick-playground');
  await expect(card).toHaveAttribute('href', '/projects/brick-playground');
  await card.click();
  await expect(page.locator('.brick-stage')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: 'Thêm Gạch 2 × 2', exact: true }).click();
  expect((await draft(page)).bricks).toHaveLength(1);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.project-card')).toHaveCount(5);
});
test('catalog direct URL and API failure retry use real data', async ({ page }) => {
  await page.route('**/api/bricks/catalog', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: 'Catalog tạm ngưng.' } }),
    }),
  );
  await page.goto('/projects/brick-playground');
  await expect(page.getByRole('alert')).toContainText('Catalog tạm ngưng.');
  await page.unroute('**/api/bricks/catalog');
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.locator('.brick-catalog button')).toHaveCount(10);
  await expect(page.locator('.brick-swatches button')).toHaveCount(8);
  await page.getByRole('button', { name: 'Màu gạch mới: Xanh dương', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Màu gạch mới: Xanh dương', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});
test('WebGL baseplate, camera orbit, PNG and repeated route lifecycle render without errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/projects/brick-playground');
  await expect(page.locator('.brick-stage')).toHaveAttribute('data-renderer', 'webgl');
  await expect(page.locator('.brick-stage')).toHaveAttribute('data-ready', 'true');
  const first = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải ảnh công trình', exact: true }).click();
  const before = await readFile((await (await first).path())!);
  expect(before.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  await page.getByRole('button', { name: 'Xem 3D', exact: true }).click();
  await expect(page.locator('.brick-stage')).toHaveAttribute('data-ready', 'true');
  const box = (await page.locator('.brick-canvas canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 30, { steps: 10 });
  await page.mouse.up();
  const next = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải ảnh công trình', exact: true }).click();
  const after = await readFile((await (await next).path())!);
  expect(before.equals(after)).toBe(false);
  for (let i = 0; i < 3; i++) {
    await page.goto('/');
    await page.goto('/projects/brick-playground');
    await expect(page.locator('.brick-stage')).toHaveAttribute('data-renderer', 'webgl');
  }
  await page.screenshot({ path: '.local/reference/brick-baseplate.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('150 colored bricks render, camera remains usable and max count cannot change the layout', async ({
  page,
}) => {
  const layout: BrickLayout = {
    schemaVersion: 1,
    title: '150 gạch',
    bricks: Array.from({ length: 150 }, (_, i) =>
      fixtureBrick(i + 1, { x: i % 32, z: Math.floor(i / 32), color: catalog.colors[i % 8].value }),
    ),
  };
  await page.addInitScript(({ key, layout }) => localStorage.setItem(key, JSON.stringify(layout)), {
    key: DRAFT_KEY,
    layout,
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  await expect(page.locator('.brick-stage')).toHaveAttribute('data-renderer', 'webgl');
  await expect(page.locator('.brick-stage-bar')).toContainText('150 / 150');
  await page.getByRole('button', { name: 'Thêm Gạch 1 × 1', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('150 gạch');
  expect(await draft(page)).toEqual(layout);
  await page.getByRole('button', { name: 'Phóng to công trình', exact: true }).click();
  await page.getByRole('button', { name: 'Đặt lại góc nhìn', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải ảnh công trình', exact: true }).click();
  expect((await readFile((await (await download).path())!)).length).toBeGreaterThan(10000);
  expect(errors).toEqual([]);
});
test('spawn every shape with chosen color, selection and baseplate remain valid', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: 'Màu gạch mới: Xanh dương', exact: true }).click();
  for (const spec of catalog.kinds)
    await page.getByRole('button', { name: `Thêm ${spec.label}`, exact: true }).click();
  const layout = await draft(page);
  expect(layout.bricks).toHaveLength(10);
  expect(layout.bricks.every((b) => b.color === '#3b82f6')).toBe(true);
  expect(new Set(layout.bricks.map((b) => b.id)).size).toBe(10);
  await expect(page.locator('.brick-instances button[aria-pressed=true]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Chọn Gạch 1 × 1 1', exact: true }).click();
  await expect(page.getByLabel('Thuộc tính gạch đang chọn')).toContainText('Gạch 1 × 1');
  await page.getByRole('button', { name: 'Màu gạch mới: Đỏ', exact: true }).click();
  expect((await draft(page)).bricks.every((b) => b.color === '#3b82f6')).toBe(true);
});
test('pointer drag snaps and stacks, invalid and canceled drops preserve one command', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1400 });
  await open(page);
  await page.getByRole('button', { name: 'Thêm Gạch 2 × 2', exact: true }).click();
  const from = await project(page, 1, 1.32, 1),
    to = await project(page, 13, 1.32, 13);
  await dragBetween(page, from, to);
  await expect
    .poll(async () => (await draft(page)).bricks[0])
    .toMatchObject({ x: 12, z: 12, y: 0 });
  await page.getByRole('button', { name: 'Thêm Gạch 2 × 2', exact: true }).click();
  await dragBetween(page, await project(page, 1, 1.32, 1), to);
  await expect
    .poll(async () => (await draft(page)).bricks[1])
    .toMatchObject({ x: 12, z: 12, y: 3 });
  const before = await draft(page),
    start = await project(page, 13, 2.52, 13),
    outside = await project(page, 41, 2.52, 13);
  await dragBetween(page, start, outside);
  await expect(page.getByRole('alert')).toContainText('ngoài chân đế');
  expect(await draft(page)).toEqual(before);
  await dragBetween(page, start, await project(page, 20, 2.52, 20), 'escape');
  expect(await draft(page)).toEqual(before);
  await dragBetween(page, start, await project(page, 20, 2.52, 20), 'pointercancel');
  expect(await draft(page)).toEqual(before);
  await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
  expect((await draft(page)).bricks[1]).toMatchObject({ x: 0, z: 0, y: 0 });
  await page.getByRole('button', { name: 'Làm lại', exact: true }).click();
  expect(await draft(page)).toEqual(before);
});
test('trash drop deletes support, settles upper bricks and one Undo restores the whole tower', async ({
  page,
}) => {
  const layout: BrickLayout = {
    schemaVersion: 1,
    title: 'Tháp thử giỏ rác',
    bricks: [
      fixtureBrick(1, { kind: 'brick-2x2', x: 12, z: 12 }),
      fixtureBrick(2, { x: 12, z: 12, y: 3 }),
      fixtureBrick(3, { x: 12, z: 12, y: 6 }),
    ],
  };
  await page.addInitScript(({ key, layout }) => localStorage.setItem(key, JSON.stringify(layout)), {
    key: DRAFT_KEY,
    layout,
  });
  await page.setViewportSize({ width: 1440, height: 1400 });
  await open(page);
  const from = await project(page, 13.85, 0.55, 13.85);
  const trash = (await page.locator('.brick-trash').boundingBox())!;
  const to = { x: trash.x + trash.width / 2, y: trash.y + trash.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await expect(page.locator('.brick-trash')).toHaveClass(/is-hover/);
  await page.mouse.up();
  await expect.poll(async () => (await draft(page)).bricks.length).toBe(2);
  expect((await draft(page)).bricks.map((b) => b.y)).toEqual([0, 3]);
  await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
  expect(await draft(page)).toEqual(layout);
  await expect(page.getByRole('button', { name: 'Hoàn tác', exact: true })).toBeDisabled();
  await dragBetween(page, from, to, 'escape');
  expect(await draft(page)).toEqual(layout);
  await dragBetween(page, from, { x: trash.x - 8, y: trash.y + trash.height / 2 });
  expect((await draft(page)).bricks).toHaveLength(3);
});
test('rotation bounds, recolor, duplicate and clear confirmation share history commands', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1400 });
  await open(page);
  await page.getByRole('button', { name: 'Thêm Gạch 2 × 4', exact: true }).click();
  await page.getByLabel('Vị trí X', { exact: true }).fill('30');
  await page.getByRole('button', { name: 'Áp dụng vị trí', exact: true }).click();
  await page.getByRole('button', { name: 'Xoay 90°', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('ngoài chân đế');
  expect((await draft(page)).bricks[0].rotation).toBe(0);
  await page.getByLabel('Vị trí X', { exact: true }).fill('10');
  await page.getByLabel('Vị trí Z', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Áp dụng vị trí', exact: true }).click();
  await page.getByRole('button', { name: 'Xoay 90°', exact: true }).click();
  expect((await draft(page)).bricks[0].rotation).toBe(90);
  await page.getByRole('button', { name: 'Đổi màu gạch: Vàng', exact: true }).click();
  await page.getByRole('button', { name: 'Nhân bản', exact: true }).click();
  const before = await draft(page);
  expect(before.bricks).toHaveLength(2);
  expect(before.bricks[0].id).not.toBe(before.bricks[1].id);
  expect(before.bricks[1]).toMatchObject({
    kind: 'brick-2x4',
    color: '#facc15',
    rotation: 90,
    y: 0,
  });
  await page.getByRole('button', { name: 'Làm trống', exact: true }).click();
  await page.getByRole('button', { name: 'Giữ công trình', exact: true }).click();
  expect(await draft(page)).toEqual(before);
  await page.getByRole('button', { name: 'Làm trống', exact: true }).click();
  await page.getByRole('button', { name: 'Làm trống chân đế', exact: true }).click();
  expect((await draft(page)).bricks).toHaveLength(0);
  await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
  expect(await draft(page)).toEqual(before);
  await page.getByRole('button', { name: 'Làm lại', exact: true }).click();
  expect((await draft(page)).bricks).toHaveLength(0);
  await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm Gạch 1 × 1', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Làm lại', exact: true })).toBeDisabled();
});
test('full base rejects spawn and draft reload recovers invalid or blocked storage safely', async ({
  page,
}) => {
  const full: BrickLayout = {
    schemaVersion: 1,
    title: 'Đế đầy',
    bricks: Array.from({ length: 128 }, (_, i) =>
      fixtureBrick(i + 1, { kind: 'brick-2x4', x: (i % 16) * 2, z: Math.floor(i / 16) * 4 }),
    ),
  };
  await open(page);
  await page.evaluate(({ key, full }) => localStorage.setItem(key, JSON.stringify(full)), {
    key: DRAFT_KEY,
    full,
  });
  await page.reload();
  await expect(page.locator('.brick-stage')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: 'Thêm Gạch 1 × 1', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('không còn vị trí');
  expect(await draft(page)).toEqual(full);
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), DRAFT_KEY);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Nháp cũ không hợp lệ');
  expect((await draft(page)).bricks).toHaveLength(0);
  await page.getByRole('button', { name: 'Thêm Gạch 1 × 2', exact: true }).click();
  const previous = await draft(page);
  await page.getByLabel('Tên công trình', { exact: true }).fill('');
  expect(await draft(page)).toEqual(previous);
  await expect(page.getByRole('button', { name: 'Lưu & chia sẻ', exact: true })).toBeDisabled();
  await page.getByLabel('Tên công trình', { exact: true }).fill('Nháp hợp lệ');
  await page.reload();
  await expect(page.getByLabel('Tên công trình', { exact: true })).toHaveValue('Nháp hợp lệ');
  expect((await draft(page)).bricks).toHaveLength(1);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota', 'QuotaExceededError');
    };
  });
  await page.getByRole('button', { name: 'Thêm Gạch 1 × 1', exact: true }).click();
  await expect(
    page.getByText('Nháp chỉ giữ trong phiên; trình duyệt không lưu được.', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.brick-stage-bar')).toContainText('2 / 150');
});
test('lost save response retries one key; shared viewer reload and copy preserve snapshot and draft', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: 'Thêm Gạch 2 × 4', exact: true }).click();
  const title = '<b>Công trình thật</b>';
  await page.getByLabel('Tên công trình', { exact: true }).fill(title);
  const before = await draft(page);
  let attempts = 0;
  await page.route('**/api/bricks/designs', async (route) => {
    const key = route.request().headers()['idempotency-key'];
    if (!keys.includes(key)) keys.push(key);
    attempts++;
    if (attempts === 1) {
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Chưa nhận được phản hồi lưu.' } }),
      });
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'Lưu & chia sẻ', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Chưa nhận được phản hồi');
  await page.getByRole('button', { name: 'Thử lưu lại', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Công trình đã được lưu', exact: true }),
  ).toBeVisible();
  expect(attempts).toBe(2);
  expect(keys).toHaveLength(1);
  const row = (
    await pool.query('SELECT id,layout FROM brick_designs WHERE idempotency_key=$1', [keys[0]])
  ).rows;
  expect(row).toHaveLength(1);
  expect(row[0].layout.title).toBe(title);
  const original = row[0].layout;
  await expect(page.getByLabel('Liên kết chia sẻ', { exact: true })).toHaveValue(
    new RegExp(`/projects/brick-playground/view/${row[0].id}$`),
  );
  await page.getByRole('link', { name: 'Mở bản chia sẻ' }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lưu & chia sẻ', exact: true })).toHaveCount(0);
  expect(await draft(page)).toEqual(before);
  await page.reload();
  await expect(page.locator('.brick-stage')).toHaveAttribute('data-ready', 'true');
  expect(await draft(page)).toEqual(before);
  await page.getByRole('button', { name: 'Tạo bản sao', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Thay nháp hiện tại bằng bản sao?', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Giữ nháp hiện tại', exact: true }).click();
  expect(await draft(page)).toEqual(before);
  await page.getByRole('button', { name: 'Tạo bản sao', exact: true }).click();
  await page.getByRole('button', { name: 'Tạo bản sao và thay nháp', exact: true }).click();
  await expect(page.getByLabel('Tên công trình', { exact: true })).toHaveValue(
    `${title} (bản sao)`,
  );
  await page.getByRole('button', { name: 'Thêm Gạch 1 × 1', exact: true }).click();
  await page.reload();
  await expect(page.locator('.brick-stage')).toHaveAttribute('data-ready', 'true');
  expect((await draft(page)).bricks).toHaveLength(2);
  expect(
    (await (await page.request.get(`/api/bricks/designs/${row[0].id}`)).json()).data.layout,
  ).toEqual(original);
  await page.getByRole('button', { name: 'Lưu & chia sẻ', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Công trình đã được lưu', exact: true }),
  ).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[1]).not.toBe(keys[0]);
  await page.goto(`/projects/brick-playground/view/${randomUUID()}`);
  await expect(page.getByRole('alert')).toContainText('Không tìm thấy công trình');
});
test('keyboard editing without WebGL supports fallback form, save and PNG limitations', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null;
      return original.apply(this, [type, ...args] as Parameters<typeof original>);
    } as typeof original;
  });
  await open(page);
  await expect(page.locator('.brick-stage')).toHaveAttribute('data-renderer', '2d');
  await expect(
    page.getByRole('button', { name: 'Tải ảnh công trình', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Thêm Gạch 1 × 2', exact: true }).click();
  await page.locator('.brick-canvas').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('r');
  expect((await draft(page)).bricks[0]).toMatchObject({ x: 1, rotation: 90 });
  await page.keyboard.press('Control+z');
  expect((await draft(page)).bricks[0].rotation).toBe(0);
  await page.keyboard.press('Control+Shift+z');
  expect((await draft(page)).bricks[0].rotation).toBe(90);
  await page.keyboard.press('Delete');
  expect((await draft(page)).bricks).toHaveLength(0);
  await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
  await page.getByRole('button', { name: 'Chọn Gạch 1 × 2 1', exact: true }).click();
  await page.getByLabel('Vị trí X', { exact: true }).fill('10');
  await page.getByLabel('Vị trí Z', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Áp dụng vị trí', exact: true }).click();
  expect((await draft(page)).bricks[0]).toMatchObject({ x: 10, z: 10 });
  const before = await draft(page);
  await page.getByLabel('Tên công trình', { exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  expect(await draft(page)).toEqual(before);
  await page.getByRole('button', { name: 'Hướng dẫn', exact: true }).click();
  await scan(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Hướng dẫn', exact: true })).toBeFocused();
  await page.route('**/api/bricks/designs', (route) => {
    keys.push(route.request().headers()['idempotency-key']);
    return route.continue();
  });
  await page.getByRole('button', { name: 'Lưu & chia sẻ', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Công trình đã được lưu', exact: true }),
  ).toBeVisible();
  const row = (
    await pool.query('SELECT layout FROM brick_designs WHERE idempotency_key=$1', [keys.at(-1)])
  ).rows;
  expect(row).toHaveLength(1);
  expect(row[0].layout.bricks[0]).toMatchObject({ x: 10, z: 10, rotation: 90 });
});
test('blocked draft reads and writes still allow editing and real database saving', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
    Storage.prototype.setItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
  });
  await open(page);
  await expect(
    page.getByText('Nháp chỉ giữ trong phiên; trình duyệt không lưu được.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Thêm Gạch 2 × 2', exact: true }).click();
  await expect(page.locator('.brick-stage-bar')).toContainText('1 / 150');
  await page.route('**/api/bricks/designs', (route) => {
    keys.push(route.request().headers()['idempotency-key']);
    return route.continue();
  });
  await page.getByRole('button', { name: 'Lưu & chia sẻ', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Công trình đã được lưu', exact: true }),
  ).toBeVisible();
  expect(
    (await pool.query('SELECT layout FROM brick_designs WHERE idempotency_key=$1', [keys.at(-1)]))
      .rows[0].layout.bricks,
  ).toHaveLength(1);
});
test('WebGL context loss switches to 2D and allows renderer recovery without losing the draft', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: 'Thêm Gạch 2 × 2', exact: true }).click();
  const before = await draft(page);
  await page.locator('.brick-canvas canvas').evaluate((canvas) => {
    const gl = (canvas as HTMLCanvasElement).getContext('webgl2');
    gl!.getExtension('WEBGL_lose_context')!.loseContext();
  });
  await expect(page.locator('.brick-stage')).toHaveAttribute('data-renderer', '2d');
  expect(await draft(page)).toEqual(before);
  await page.getByRole('button', { name: 'Xem 3D', exact: true }).click();
  await expect(page.locator('.brick-stage')).toHaveAttribute('data-renderer', 'webgl');
  expect(await draft(page)).toEqual(before);
});
test('mobile touch drag and trash operate while catalog dialog restores focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 1200 });
  await open(page);
  await page.getByRole('button', { name: /Hộp gạch & thuộc tính/ }).click();
  await page.getByRole('button', { name: 'Thêm Gạch 2 × 2', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Hộp gạch & thuộc tính/ })).toBeFocused();
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  const from = await project(page, 1, 1.32, 1),
    to = await project(page, 13, 1.32, 13);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  for (let i = 1; i <= 10; i++)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: from.x + ((to.x - from.x) * i) / 10, y: from.y + ((to.y - from.y) * i) / 10 },
      ],
    });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(async () => (await draft(page)).bricks[0]).toMatchObject({ x: 12, z: 12 });
  const trash = (await page.locator('.brick-trash').boundingBox())!,
    end = { x: trash.x + trash.width / 2, y: trash.y + trash.height / 2 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [to] });
  for (let i = 1; i <= 10; i++)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: to.x + ((end.x - to.x) * i) / 10, y: to.y + ((end.y - to.y) * i) / 10 }],
    });
  await expect(page.locator('.brick-trash')).toHaveClass(/is-hover/);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(async () => (await draft(page)).bricks.length).toBe(0);
  await session.detach();
});
for (const width of [360, 768, 1440])
  test(`responsive editor, panels and shared viewer meet axe checks at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 1000 });
    await open(page);
    await scan(page);
    if (width === 360) await page.getByRole('button', { name: /Hộp gạch & thuộc tính/ }).click();
    await page.getByRole('button', { name: 'Màu gạch mới: Đen', exact: true }).click();
    await scan(page);
    await page.getByRole('button', { name: 'Thêm Gạch 2 × 2', exact: true }).click();
    if (width === 360) await page.getByRole('button', { name: /Hộp gạch & thuộc tính/ }).click();
    await scan(page);
    if (width === 360) await page.keyboard.press('Escape');
    await page.screenshot({ path: `.local/reference/brick-editor-${width}.png`, fullPage: true });
    const key = randomUUID();
    keys.push(key);
    const response = await page.request.post('/api/bricks/designs', {
      headers: { Origin: 'http://127.0.0.1:5174', 'Idempotency-Key': key },
      data: { layout: await draft(page) },
    });
    expect(response.status()).toBe(201);
    const { data: snapshot } = await response.json();
    await page.goto(`/projects/brick-playground/view/${snapshot.id}`);
    await expect(page.locator('.brick-stage')).toHaveAttribute('data-ready', 'true');
    await scan(page);
    await page.getByRole('button', { name: 'Sơ đồ', exact: true }).click();
    await expect(page.locator('.brick-stage')).toHaveAttribute('data-renderer', '2d');
    await scan(page);
    expect(errors).toEqual([]);
  });
