import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('marketplace brand shortcuts, filter chips, reset and section links work with shared URLs', async ({
  page,
}) => {
  await page.goto('/projects/autohub?sort=price_asc&pageSize=3&page=2');
  await expect(page.locator('.car-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Toyota', exact: true }).click();
  await expect(page).toHaveURL(/brand=Toyota/);
  expect(new URL(page.url()).searchParams.has('page')).toBe(false);
  await expect(page.locator('.car-card').first()).toContainText('Toyota');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Toyota', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByLabel('Hãng xe', { exact: true })).toHaveValue('Toyota');
  await page.getByLabel('Giá tối đa').selectOption('700000000');
  await expect(page.getByRole('button', { name: /Bỏ lọc Giá đến:/ })).toBeVisible();
  await page.getByRole('button', { name: 'Xóa tất cả bộ lọc', exact: true }).click();
  const reset = new URL(page.url()).searchParams;
  expect([...reset.keys()].sort()).toEqual(['pageSize', 'sort']);
  expect(reset.get('sort')).toBe('price_asc');
  expect(reset.get('pageSize')).toBe('3');
  await expect(page.locator('.car-card')).toHaveCount(3);
  await page.getByLabel('Tìm kiếm xe', { exact: true }).fill('Civic');
  await page.getByRole('button', { name: 'Tìm xe', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Civic', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bỏ lọc Từ khóa: Civic', exact: true }).click();
  await expect(page.getByLabel('Tìm kiếm xe', { exact: true })).toHaveValue('');
  await page.getByLabel('Trạng thái xe', { exact: true }).selectOption('sold');
  await expect(page.locator('.car-card').first().locator('.badge')).toHaveText('Đã bán');
  const labels = await page.locator('.car-card .badge').allTextContents();
  expect(labels.every((label) => label === 'Đã bán')).toBe(true);

  await page.goto('/projects/autohub/cars/toyota-camry');
  await page.getByRole('link', { name: 'Hướng dẫn mua xe', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/autohub#buy-guide$/);
  await expect(page.locator('#buy-guide')).toBeInViewport();
  await page.locator('.autohub-header').getByRole('link', { name: 'Tìm xe', exact: true }).click();
  await expect(page.locator('#auto-catalog-heading')).toBeInViewport();
  await page.reload();
  await expect(page.locator('#auto-catalog-heading')).toBeInViewport();
});

test('mobile filters expand by keyboard, apply and clear filters, and favorites survive reload', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/projects/autohub');
  const toggle = page.getByRole('button', { name: 'Bộ lọc', exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('complementary', { name: 'Lọc danh sách xe' })).not.toBeVisible();
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.getByLabel('Hãng xe', { exact: true }).selectOption('Toyota');
  await page.getByLabel('Năm sản xuất', { exact: true }).fill('2023');
  await expect(page).toHaveURL(/year=2023/);
  await expect(page.getByRole('heading', { name: 'Camry', exact: true })).toBeVisible();
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(
    scan.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Xóa tất cả bộ lọc', exact: true }).click();
  await expect(page.locator('.car-card')).toHaveCount(9);
  await expect(page.getByRole('button', { name: 'Bộ lọc', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await page.getByRole('button', { name: 'Bộ lọc', exact: true }).click();
  await expect(page.getByLabel('Hãng xe', { exact: true })).not.toBeVisible();
  const favorite = page
    .locator('.car-card')
    .first()
    .getByRole('button', { name: /Yêu thích/ });
  const label = await favorite.getAttribute('aria-label');
  await favorite.click();
  await page.reload();
  await expect(page.getByRole('button', { name: label!, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
