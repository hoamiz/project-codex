import { test, expect } from '@playwright/test';
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
test.afterAll(() => pool.end());
async function login(page: import('@playwright/test').Page) {
  await page.goto('/projects/admin');
  await page.getByLabel('Email', { exact: true }).fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Một góc nhìn rõ ràng.' })).toBeVisible();
}
test('customer creates lead, admin updates it, session survives reload and logout revokes access', async ({
  page,
}) => {
  const name = `E2E Customer ${Date.now()}`;
  await page.goto('/');
  await expect(page.locator('.project-card')).toHaveCount(3);
  await page.locator('.project-autohub').click();
  await page.getByRole('heading', { name: 'Camry', exact: true }).click();
  await page.getByRole('button', { name: 'Đăng ký lái thử' }).click();
  await page.getByLabel('Họ và tên').fill(name);
  await page.getByLabel('Số điện thoại').fill('0901234567');
  await page.getByLabel(/Lịch lái thử/).fill('2027-12-10T10:00');
  await page.getByRole('button', { name: 'Gửi yêu cầu' }).click();
  await expect(page.getByText('Đã nhận yêu cầu của bạn.')).toBeVisible();
  try {
    const r = await pool.query('SELECT * FROM leads WHERE name=$1', [name]);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].type).toBe('test_drive');
    await login(page);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Một góc nhìn rõ ràng.' })).toBeVisible();
    await page.getByRole('link', { name: 'Yêu cầu khách hàng', exact: true }).first().click();
    await page.getByLabel('Tìm khách hàng').fill(name);
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: `Xem ${name}` }).click();
    await page.getByLabel('Trạng thái yêu cầu', { exact: true }).selectOption('completed');
    await page.getByRole('button', { name: 'Lưu trạng thái' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.locator('tr').filter({ hasText: name }).getByText('Hoàn tất')).toBeVisible();
    expect(
      (await pool.query('SELECT status FROM leads WHERE name=$1', [name])).rows[0].status,
    ).toBe('completed');
    await page.getByRole('button', { name: 'Đăng xuất' }).click();
    await expect(page.getByRole('heading', { name: 'Đăng nhập quản trị.' })).toBeVisible();
    await page.goto('/projects/admin/cars');
    await expect(page.getByRole('heading', { name: 'Đăng nhập quản trị.' })).toBeVisible();
  } finally {
    await pool.query('DELETE FROM leads WHERE name=$1', [name]);
  }
});
test('favorites persist, filters survive reload and comparison accepts at most three cars', async ({
  page,
}) => {
  await page.goto('/projects/autohub');
  const first = page.locator('.car-card').first();
  const favorite = first.getByRole('button', { name: /Yêu thích/ });
  const name = await favorite.getAttribute('aria-label');
  await favorite.click();
  await page.reload();
  await expect(page.getByRole('button', { name: name!, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByLabel('Hãng xe', { exact: true }).selectOption('Toyota');
  await expect(page).toHaveURL(/brand=Toyota/);
  await page.reload();
  await expect(page.getByLabel('Hãng xe', { exact: true })).toHaveValue('Toyota');
  await page.getByLabel('Hãng xe', { exact: true }).selectOption('');
  await expect(page.locator('.car-card')).toHaveCount(9);
  for (let i = 0; i < 4; i++)
    await page
      .locator('.car-card')
      .nth(i)
      .getByRole('button', { name: /So sánh/ })
      .click();
  await expect(page.getByText('Bạn có thể so sánh tối đa 3 xe.')).toBeVisible();
  await page.locator('.compare-dock').getByRole('link').click();
  await expect(page.locator('.compare-card')).toHaveCount(3);
  await page.reload();
  await expect(page.locator('.compare-card')).toHaveCount(3);
});
test('expired database session clears protected UI and redirects to login', async ({ page }) => {
  await login(page);
  const cookie = (await page.context().cookies()).find((c) => c.name === 'codex.sid')!;
  const sid = decodeURIComponent(cookie.value).slice(2).split('.')[0];
  await pool.query("UPDATE auth_sessions SET expire='2000-01-01' WHERE sid=$1", [sid]);
  await page.getByRole('link', { name: 'Quản lý xe', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Đăng nhập quản trị.' })).toBeVisible();
  await expect(page.locator('.admin-content')).not.toBeVisible();
});
test('admin car form writes database; update and archive affect public store', async ({ page }) => {
  const slug = `e2e-car-${Date.now()}`;
  await login(page);
  await page.getByRole('link', { name: 'Quản lý xe', exact: true }).first().click();
  await page.getByRole('button', { name: 'Thêm xe' }).click();
  await page.getByLabel('Hãng xe', { exact: true }).fill('E2E Brand');
  await page.getByLabel('Dòng xe').fill('E2E Model');
  await page.getByLabel('Slug URL').fill(slug);
  await page.getByLabel('Giá (VND)').fill('500000000');
  await page
    .getByLabel('Mô tả', { exact: true })
    .fill('Xe được tạo bởi kiểm thử E2E và sẽ được dọn sau khi hoàn thành.');
  await page.getByRole('button', { name: 'Lưu xe' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  try {
    await page.getByLabel('Tìm kiếm xe quản trị').fill('E2E Model');
    await page.getByRole('button', { name: 'Sửa E2E Model' }).click();
    await page.getByLabel('Giá (VND)').fill('550000000');
    await page.getByRole('button', { name: 'Lưu xe' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect(
      Number(
        (await pool.query('SELECT price_vnd FROM cars WHERE slug=$1', [slug])).rows[0].price_vnd,
      ),
    ).toBe(550000000);
    await page.goto(`/projects/autohub/cars/${slug}`);
    await expect(page.getByText('550.000.000 ₫', { exact: true })).toBeVisible();
    await page.goto('/projects/admin/cars?search=E2E+Model');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Lưu trữ E2E Model' }).click();
    await expect(page.getByRole('cell', { name: 'Đã lưu trữ', exact: true })).toBeVisible();
    await page.goto(`/projects/autohub/cars/${slug}`);
    await expect(page.getByText('Không tìm thấy xe.')).toBeVisible();
  } finally {
    await pool.query('DELETE FROM cars WHERE slug=$1', [slug]);
  }
});
