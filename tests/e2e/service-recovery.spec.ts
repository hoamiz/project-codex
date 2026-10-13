import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('cold startup holds app queries then opens the exact deep link automatically', async ({
  page,
}) => {
  let ready = false,
    portfolio = 0;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().includes('/api/portfolio/projects')) portfolio++;
  });
  await page.route('**/api/health', (route) =>
    ready
      ? route.continue()
      : route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: '{"error":{"message":"Starting"}}',
        }),
  );
  await page.goto('/projects/brick-playground?from=recovery#build');
  await expect(
    page.getByRole('heading', { name: 'Một chút chờ. Nhiều trải nghiệm.' }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Trang sẽ tự mở');
  expect(portfolio).toBe(0);
  ready = true;
  await expect(page.locator('.brick-stage')).toHaveAttribute('data-ready', 'true');
  await expect(page).toHaveURL(/\/projects\/brick-playground\?from=recovery#build$/);
  expect(errors).toEqual([]);
});
test('HTTP200 hosting HTML does not enter the app before real health JSON', async ({ page }) => {
  let ready = false;
  await page.route('**/api/health', (route) =>
    ready
      ? route.continue()
      : route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<html>Starting service</html>',
        }),
  );
  await page.goto('/');
  await expect(page.locator('.service-wait')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Đang chuẩn bị dữ liệu');
  await expect(page.locator('.project-card')).toHaveCount(0);
  ready = true;
  await expect(page.locator('.project-card')).toHaveCount(5);
});
test('bounded wait exposes retry and a fresh attempt recovers without reload loops', async ({
  page,
}) => {
  let ready = false,
    documents = 0;
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++;
  });
  await page.clock.install();
  await page.route('**/api/health', (route) =>
    ready
      ? route.continue()
      : route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }),
  );
  await page.goto('/');
  await expect(page.locator('.service-wait')).toBeVisible();
  await page.clock.runFor(121000);
  await expect(page.getByRole('heading', { name: 'Chưa kết nối được dịch vụ.' })).toBeVisible();
  ready = true;
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(5);
  expect(documents).toBe(1);
});
test('real browser offline/online preserves login form and does not replay mutations', async ({
  page,
  context,
}) => {
  let posts = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST') posts++;
  });
  await page.goto('/projects/admin/login?keep=yes#form');
  await page.getByLabel('Email', { exact: true }).fill('typing@example.test');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('typing-stays-local');
  await context.setOffline(true);
  await expect(page.locator('.service-banner')).toContainText('Bạn đang ngoại tuyến.');
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('typing@example.test');
  await context.setOffline(false);
  await expect(page.locator('.service-banner')).toHaveCount(0);
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toHaveValue('typing-stays-local');
  await expect(page).toHaveURL(/\/projects\/admin\/login\?keep=yes#form$/);
  expect(posts).toBe(0);
});
test('failed save starts recovery while the brick editor/draft stays mounted; POST is sent once', async ({
  page,
}) => {
  let healthy = true,
    posts = 0;
  await page.route('**/api/health', (route) =>
    healthy
      ? route.continue()
      : route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }),
  );
  await page.route('**/api/bricks/designs', (route) => {
    posts++;
    return route.abort('connectionfailed');
  });
  await page.goto('/projects/brick-playground');
  await expect(page.locator('.brick-stage')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: 'Thêm Gạch 2 × 2', exact: true }).click();
  await page.getByLabel('Tên công trình', { exact: true }).fill('Giữ công trình đang làm');
  const before = await page.evaluate(() =>
    localStorage.getItem('project-codex:brick-playground:v1'),
  );
  healthy = false;
  await page.getByRole('button', { name: 'Lưu & chia sẻ', exact: true }).click();
  await expect(page.locator('.service-banner')).toContainText('Đang kết nối lại');
  await expect(page.getByLabel('Tên công trình', { exact: true })).toHaveValue(
    'Giữ công trình đang làm',
  );
  expect(await page.evaluate(() => localStorage.getItem('project-codex:brick-playground:v1'))).toBe(
    before,
  );
  healthy = true;
  await expect(page.locator('.service-banner')).toHaveCount(0);
  expect(posts).toBe(1);
  await expect(page.getByLabel('Tên công trình', { exact: true })).toHaveValue(
    'Giữ công trình đang làm',
  );
});
for (const width of [360, 768, 1440])
  test(`waiting/retry UI is responsive and accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/api/health', (route) =>
      route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }),
    );
    await page.goto('/');
    await expect(page.locator('.service-wait')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
  });
