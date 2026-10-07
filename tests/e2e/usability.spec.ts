import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for (const width of [360, 768, 1440])
  test(`responsive and accessible pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const inventory = await (await page.request.get('/api/cars')).json();
    const compareRoute = `/projects/autohub/compare?ids=${inventory.data
      .slice(0, 3)
      .map((car: { id: string }) => car.id)
      .join(',')}`;
    for (const route of [
      '/',
      '/projects/autohub',
      '/projects/autohub/cars/toyota-camry',
      compareRoute,
      '/projects/memory-match',
      '/projects/admin/login',
    ]) {
      await page.goto(route);
      if (route === '/') await expect(page.locator('.project-card')).toHaveCount(4);
      if (route === '/projects/autohub')
        await expect(page.locator('.car-card').first()).toBeVisible();
      if (route.includes('/autohub/cars/'))
        await expect(page.locator('.detail-info')).toBeVisible();
      if (route === compareRoute) await expect(page.locator('.compare-card')).toHaveCount(3);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        route,
      ).toBe(true);
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        scan.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        route,
      ).toEqual([]);
    }
    await page.goto('/projects/admin');
    await page.getByLabel('Email', { exact: true }).fill(process.env.ADMIN_EMAIL!);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Một góc nhìn rõ ràng.' })).toBeVisible();
    for (const route of ['/projects/admin', '/projects/admin/cars', '/projects/admin/leads']) {
      await page.goto(route);
      await expect(page.locator('.admin-content')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        route,
      ).toBe(true);
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        scan.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        route,
      ).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
test('keyboard modal, API retry, 404 and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/projects/autohub/cars/toyota-camry');
  await page.getByRole('button', { name: 'Nhận tư vấn' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.map((v) => v.id)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.route('**/api/cars?*', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'API fixture unavailable' } }),
    }),
  );
  await page.goto('/projects/autohub?search=error-fixture');
  await expect(page.getByRole('alert')).toContainText('API fixture unavailable');
  await page.unroute('**/api/cars?*');
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByText('Chưa có dữ liệu phù hợp.')).toBeVisible();
  await page.goto('/unknown-route');
  await expect(page.getByRole('heading', { name: 'Trang không tồn tại.' })).toBeVisible();
});
