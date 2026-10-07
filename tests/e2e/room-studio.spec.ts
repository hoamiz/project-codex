import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { OrthographicCamera, Vector3 } from 'three';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
const keys: string[] = [];
const draftKey = 'project-codex-room-draft-v1';
test.afterAll(async () => {
  await pool.query('DELETE FROM room_designs WHERE idempotency_key=ANY($1::uuid[])', [keys]);
  await pool.end();
});
async function openStudio(page: Page) {
  await page.goto('/projects/room-studio');
  await expect(page.locator('.room-stage')).toHaveAttribute('data-ready', 'true');
}
async function draft(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), draftKey);
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

test('WebGL drag commits one move, invalid placement preserves the draft, history and PNG work', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await openStudio(page);
  await expect(page.locator('.room-stage')).toHaveAttribute('data-renderer', 'webgl');
  const box = (await page.locator('.room-canvas canvas').boundingBox())!;
  // Chiếu tọa độ model bằng camera mặc định; thao tác bằng chuột thật, không gọi callback React.
  const camera = new OrthographicCamera(
    -box.width / 2,
    box.width / 2,
    box.height / 2,
    -box.height / 2,
    0.1,
    60,
  );
  camera.position.set(8, 7, 9);
  camera.lookAt(0, 0.7, 0);
  camera.zoom = Math.min(box.width / 10.5, box.height / 8.2);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const project = (x: number, y: number, z: number) => {
    const point = new Vector3(x, y, z).project(camera);
    return {
      x: box.x + ((point.x + 1) * box.width) / 2,
      y: box.y + ((1 - point.y) * box.height) / 2,
    };
  };
  const from = project(-1.75, 0.65, -1.25),
    to = project(-1.75, 0.65, 0);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByLabel('Vị trí Z', { exact: true })).toHaveValue('0');
  await page.getByLabel('Vị trí X', { exact: true }).fill('3');
  await expect(page.getByRole('alert')).toContainText('nằm trong phòng');
  await expect(page.getByLabel('Vị trí X', { exact: true })).toHaveValue('-1.75');
  await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
  await expect(page.getByLabel('Vị trí Z', { exact: true })).toHaveValue('-1.25');
  await expect(page.getByRole('button', { name: 'Hoàn tác', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Làm lại', exact: true }).click();
  await page.getByRole('button', { name: 'Đổi màu đồ sang #ad9fc1', exact: true }).click();
  await page.getByRole('button', { name: 'Ban đêm', exact: true }).click();
  await page.reload();
  await expect(page.locator('.room-stage')).toHaveAttribute('data-ready', 'true');
  const layout = await draft(page);
  expect(layout.items[0]).toMatchObject({ x: -1.75, z: 0, color: '#ad9fc1' });
  expect(layout.lighting).toBe('night');
  await page.getByRole('button', { name: 'Xem phòng', exact: true }).click();
  await page.getByRole('button', { name: 'Phóng to phòng', exact: true }).click();
  await page.getByRole('button', { name: 'Thu nhỏ phòng', exact: true }).click();
  await page.getByRole('button', { name: 'Đặt lại góc nhìn', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải ảnh căn phòng', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('room-studio.png');
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.length).toBeGreaterThan(10000);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 35, { steps: 10 });
  await page.mouse.up();
  const rotatedDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải ảnh căn phòng', exact: true }).click();
  const rotated = await readFile((await (await rotatedDownloadPromise).path())!);
  expect(rotated.equals(bytes)).toBe(false);
  expect(await draft(page)).toEqual(layout);
  expect(errors).toEqual([]);
});

test('reset confirmation, keyboard rotation/movement/delete, redo and minimal office challenge', async ({
  page,
}) => {
  await openStudio(page);
  await page.getByRole('button', { name: 'Làm trống', exact: true }).click();
  await page.getByRole('button', { name: 'Giữ thiết kế', exact: true }).click();
  expect((await draft(page)).items).toHaveLength(6);
  await page.getByRole('button', { name: 'Làm trống', exact: true }).click();
  await page.getByRole('button', { name: 'Làm trống phòng', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm Bàn làm việc', exact: true }).click();
  await page.locator('.room-canvas').focus();
  await page.keyboard.press('r');
  await expect(page.locator('.room-selected-editor')).toContainText('90°');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Vị trí X', { exact: true })).toHaveValue('0.25');
  await page.keyboard.press('Control+z');
  await expect(page.getByLabel('Vị trí X', { exact: true })).toHaveValue('0');
  await page.keyboard.press('Control+Shift+z');
  await expect(page.getByLabel('Vị trí X', { exact: true })).toHaveValue('0.25');
  await page.keyboard.press('Delete');
  expect((await draft(page)).items).toHaveLength(0);
  await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm Ghế', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm Đèn đứng', exact: true }).click();
  await expect(page.locator('.room-challenge')).toContainText('Góc làm việc đã sẵn sàng!');
  await page.getByRole('button', { name: 'Sơ đồ', exact: true }).click();
  await expect(page.locator('.room-stage')).toHaveAttribute('data-renderer', '2d');
  await page.getByRole('button', { name: 'Chọn trên sơ đồ: Ghế 2', exact: true }).click();
  await expect(page.locator('.room-selected-editor h2')).toHaveText('Ghế');
});

test('lost save response retries the same key, share survives reload and editing a copy preserves the snapshot', async ({
  page,
}) => {
  await openStudio(page);
  const title = `<b>Room ${Date.now()}</b>`;
  await page.getByLabel('Tên thiết kế', { exact: true }).fill(title);
  let attempts = 0;
  await page.route('**/api/rooms', async (route) => {
    const key = route.request().headers()['idempotency-key'];
    if (!keys.includes(key)) keys.push(key);
    attempts++;
    if (attempts === 1) {
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'UNAVAILABLE', message: 'Chưa nhận được phản hồi lưu.' },
        }),
      });
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'Lưu & chia sẻ', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Chưa nhận được phản hồi lưu.');
  await page.getByRole('button', { name: 'Thử lưu lại', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Thiết kế đã được lưu' })).toBeVisible();
  expect(attempts).toBe(2);
  const key = keys.at(-1)!;
  const rows = (
    await pool.query('SELECT id,layout FROM room_designs WHERE idempotency_key=$1', [key])
  ).rows;
  expect(rows).toHaveLength(1);
  const original = rows[0].layout;
  const url = await page.getByLabel('Liên kết chia sẻ', { exact: true }).inputValue();
  expect(url).toContain(`/projects/room-studio/view/${rows[0].id}`);
  await scan(page);
  await page.getByRole('link', { name: 'Mở bản chia sẻ' }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lưu & chia sẻ', exact: true })).toHaveCount(0);
  await expect(page.locator('.room-catalog')).toHaveCount(0);
  expect(await draft(page)).toEqual(original);
  await page.reload();
  await expect(page.locator('.room-stage')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tạo bản sao để chỉnh sửa' }).click();
  await expect(page.getByLabel('Tên thiết kế', { exact: true })).toHaveValue(`${title} (bản sao)`);
  await page.getByRole('button', { name: 'Thêm Ghế', exact: true }).click();
  expect((await draft(page)).items).toHaveLength(7);
  await page.reload();
  await expect(page.getByLabel('Tên thiết kế', { exact: true })).toHaveValue(`${title} (bản sao)`);
  expect((await draft(page)).items).toHaveLength(7);
  expect((await (await page.request.get(`/api/rooms/${rows[0].id}`)).json()).data.layout).toEqual(
    original,
  );
});

test('corrupt draft, unavailable WebGL/storage and API errors leave useful editing and retry paths', async ({
  page,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, '{broken');
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
      return original.apply(this, [type, ...args] as Parameters<typeof original>);
    } as typeof original;
  }, draftKey);
  await openStudio(page);
  await expect(page.locator('.room-stage')).toHaveAttribute('data-renderer', '2d');
  expect((await draft(page)).items).toHaveLength(6);
  await page.getByRole('button', { name: 'Chọn trên sơ đồ: Giường ngủ 1', exact: true }).click();
  await page.getByRole('button', { name: 'Dịch đồ về phía trước' }).click();
  expect((await draft(page)).items[0].z).toBe(-1);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
  });
  await page.getByRole('button', { name: 'Ban đêm', exact: true }).click();
  await expect(page.getByText('Nháp chỉ giữ trong phiên', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ban đêm', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await scan(page);
  await page.route('**/api/rooms/catalog', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'Catalog tạm ngưng.' } }),
    }),
  );
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Catalog tạm ngưng.');
  await page.unroute('**/api/rooms/catalog');
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.locator('.room-stage')).toHaveAttribute('data-ready', 'true');
  await page.goto(`/projects/room-studio/view/${randomUUID()}`);
  await expect(page.getByRole('alert')).toContainText('Không tìm thấy thiết kế này.');
  await page.getByRole('link', { name: 'Về Room Studio', exact: true }).click();
  await expect(page.locator('.room-stage')).toHaveAttribute('data-ready', 'true');
});

for (const width of [360, 768, 1440])
  test(`editor, mobile panels, help and share page are responsive and accessible at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await openStudio(page);
    await scan(page);
    await page.getByRole('button', { name: 'Thêm Ghế', exact: true }).click();
    await expect(page.locator('.room-selected-editor')).toBeVisible();
    await scan(page);
    await page.getByRole('button', { name: 'Hướng dẫn', exact: true }).click();
    await scan(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Hướng dẫn', exact: true })).toBeFocused();
    const key = randomUUID();
    keys.push(key);
    const { data: catalog } = await (await page.request.get('/api/rooms/catalog')).json();
    const response = await page.request.post('/api/rooms', {
      headers: { Origin: 'http://127.0.0.1:5174', 'Idempotency-Key': key },
      data: { layout: { ...catalog.starter, title: `Responsive room ${width}` } },
    });
    expect(response.status()).toBe(201);
    const { data: snapshot } = await response.json();
    await page.goto(`/projects/room-studio/view/${snapshot.id}`);
    await expect(page.locator('.room-stage')).toHaveAttribute('data-ready', 'true');
    await scan(page);
    await page.getByRole('button', { name: 'Sơ đồ', exact: true }).click();
    await expect(page.locator('.room-stage')).toHaveAttribute('data-renderer', '2d');
    await scan(page);
    expect(errors).toEqual([]);
  });
