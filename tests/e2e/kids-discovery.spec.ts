import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const base = '/projects/kids-learning';
const themes = [
  ['ocean', 'Đại dương'],
  ['desert', 'Sa mạc'],
  ['jungle', 'Rừng rậm'],
  ['dinosaurs', 'Thế giới khủng long'],
  ['transport', 'Phương tiện giao thông'],
];
test.use({ viewport: { width: 1280, height: 1100 } });
async function startNumbers(page: Page, end = 3) {
  await page.goto(base + '/number-search');
  await page.getByRole('button', { name: `1–${end}`, exact: true }).click();
  await page.getByRole('button', { name: /Bắt đầu/ }).click();
}
async function findValue(page: Page, value: number) {
  for (const item of await page.locator(`.number-search-card[data-value="${value}"]`).all())
    await item.click();
}
async function startSeek(page: Page, theme = 'ocean') {
  await page.goto(base + '/hide-and-seek');
  await page.getByRole('combobox', { name: 'Chủ đề', exact: true }).selectOption(theme);
  await page.getByRole('button', { name: /Bắt đầu/ }).click();
  await expect(page.locator('.seek-board')).toHaveAttribute('data-theme', theme);
}

test('K07 four menu cards and discovery direct/reload/Back, guides keep real round and focus', async ({
  page,
}) => {
  await page.goto(base);
  await expect(page.locator('.learning-menu-card')).toHaveCount(4);
  await page.getByRole('link', { name: /BÀI 03/ }).click();
  await expect(page).toHaveURL(base + '/number-search');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tìm số sắc màu', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Bắt đầu/ }).click();
  const round = await page.locator('.number-search-board').getAttribute('data-round');
  await page.getByRole('button', { name: 'Xem cách chơi', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('ba số giống nhau');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Xem cách chơi', exact: true })).toBeFocused();
  await expect(page.locator('.number-search-board')).toHaveAttribute('data-round', round!);
  await expect(page.locator('.number-search-card[data-found="true"]')).toHaveCount(0);
  await page.getByRole('link', { name: 'Trốn tìm', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Trốn tìm kỳ thú', exact: true })).toBeVisible();
  await page.goBack();
});
test('K03 numbers start black, future/repeated clicks and hints do not count; full ascending round colors and rewards', async ({
  page,
}) => {
  await startNumbers(page);
  await expect(page.locator('.number-search-card')).toHaveCount(9);
  expect(
    await page
      .locator('.number-search-card')
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(40);
  expect(
    await page
      .locator('.number-search-card')
      .evaluateAll((items) =>
        items.every((el) => getComputedStyle(el).color === 'rgb(32, 37, 43)'),
      ),
  ).toBe(true);
  await page.locator('.number-search-card[data-value="2"]').first().click();
  await expect(page.locator('.number-search-card[data-found="true"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Gợi ý', exact: true }).click();
  await expect(page.locator('.number-search-board .discovery-hint')).toHaveCount(1);
  await expect(page.locator('.number-search-card[data-found="true"]')).toHaveCount(0);
  for (let value = 1; value <= 3; value++) {
    await expect(page.locator('.number-search-prompt')).toHaveAttribute(
      'data-target',
      String(value),
    );
    await expect(page.locator('.number-search-board')).toHaveAttribute('data-phase', 'playing');
    await findValue(page, value);
    await expect(
      page.locator(`.number-search-card[data-value="${value}"][data-found="true"]`),
    ).toHaveCount(3);
    const colors = await page
      .locator(`.number-search-card[data-value="${value}"]`)
      .evaluateAll((items) => items.map((el) => getComputedStyle(el).color));
    expect(new Set(colors).size).toBe(1);
    expect(colors[0]).not.toBe('rgb(32, 37, 43)');
  }
  await expect(page.locator('.number-search-board')).toHaveAttribute('data-phase', 'completed');
  await expect(page.locator('.discovery-complete')).toContainText('9 số');
  await expect(page.getByRole('button', { name: /Bộ sưu tập 1 trên/ })).toBeVisible();
  const round = await page.locator('.number-search-board').getAttribute('data-round');
  await page.getByRole('button', { name: 'Chơi lại →', exact: true }).click();
  await expect(page.locator('.number-search-board')).not.toHaveAttribute('data-round', round!);
  await expect(page.locator('.number-search-card[data-found="true"]')).toHaveCount(0);
});
test('K03 presets/range keep last-edited rules; hidden and tutorial pause celebration; new round cancels old timer', async ({
  page,
}) => {
  await startNumbers(page, 10);
  await expect(page.locator('.number-search-card')).toHaveCount(30);
  const start = page.getByLabel('Từ số', { exact: true }),
    end = page.getByLabel('Đến số', { exact: true });
  await start.fill('10');
  await end.focus();
  await expect(start).toHaveValue('9');
  await page.getByRole('button', { name: /Bắt đầu/ }).click();
  await expect(page.locator('.number-search-card')).toHaveCount(6);
  await page.getByRole('button', { name: '1–3', exact: true }).click();
  await page.getByRole('button', { name: /Bắt đầu/ }).click();
  await findValue(page, 1);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(4400);
  await expect(page.locator('.number-search-prompt')).toHaveAttribute('data-target', '1');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.getByRole('button', { name: 'Xem cách chơi', exact: true }).click();
  await page.waitForTimeout(4400);
  await expect(page.locator('.number-search-prompt')).toHaveAttribute('data-target', '1');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Bắt đầu/ }).click();
  const fresh = await page.locator('.number-search-board').getAttribute('data-round');
  await page.waitForTimeout(4400);
  await expect(page.locator('.number-search-prompt')).toHaveAttribute('data-target', '1');
  await expect(page.locator('.number-search-board')).toHaveAttribute('data-round', fresh!);
  await expect(page.locator('.number-search-card[data-found="true"]')).toHaveCount(0);
});
for (const [theme, label] of themes)
  test(`K06 ${theme}: correct themed images, target selection, hints, full completion and random next screen`, async ({
    page,
  }) => {
    await startSeek(page, theme);
    await expect(page.locator('.seek-heading')).toContainText(label);
    await expect(page.locator('.seek-targets button')).toHaveCount(5);
    await expect(page.locator('.seek-hidden-item')).toHaveCount(5);
    expect(
      await page
        .locator('.seek-board img')
        .evaluateAll((images) =>
          images.every(
            (el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    ).toBe(true);
    const items = await page.locator('.seek-hidden-item').evaluateAll((items) =>
      items.map((el) => ({
        id: el.getAttribute('data-object')!,
        label: el.getAttribute('aria-label')!.replace('Trong tranh: ', ''),
      })),
    );
    await page.getByRole('button', { name: `Tìm ${items[2].label}`, exact: true }).click();
    await page.locator(`[data-object="${items[0].id}"]`).click();
    await expect(page.locator('.seek-hidden-item[data-found="true"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Gợi ý', exact: true }).click();
    await expect(page.locator('.seek-board .discovery-hint')).toHaveAttribute(
      'data-object',
      items[2].id,
    );
    await expect(page.locator('.seek-hidden-item[data-found="true"]')).toHaveCount(0);
    for (const item of items) {
      await page.getByRole('button', { name: `Tìm ${item.label}`, exact: true }).click();
      await page.locator(`[data-object="${item.id}"]`).click();
      await expect(page.locator(`[data-object="${item.id}"]`)).toBeDisabled();
    }
    await expect(page.locator('.discovery-complete')).toContainText('5 hình');
    await expect(page.getByRole('button', { name: /Bộ sưu tập 1 trên/ })).toBeVisible();
    const old = await page.locator('.seek-board').getAttribute('data-round');
    await page.getByRole('button', { name: 'Màn tiếp →', exact: true }).click();
    await expect(page.locator('.seek-board')).not.toHaveAttribute('data-round', old!);
    await expect(page.locator('.seek-board')).not.toHaveAttribute('data-theme', theme);
    await expect(page.locator('.seek-hidden-item[data-found="true"]')).toHaveCount(0);
  });
test('K06 touch/keyboard, resize and tutorial keep target/positions/progress; hints never award', async ({
  page,
}) => {
  await startSeek(page, 'jungle');
  const board = page.locator('.seek-board');
  const round = await board.getAttribute('data-round');
  const before = await page
    .locator('.seek-hidden-item')
    .evaluateAll((items) => items.map((el) => el.getAttribute('style')));
  const first = page.locator('.seek-targets button').first();
  await first.focus();
  await page.keyboard.press('Enter');
  const label = (await first.getAttribute('aria-label'))!.replace('Tìm ', '');
  const target = page.getByRole('button', { name: `Trong tranh: ${label}`, exact: true });
  const box = (await target.boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('.seek-hidden-item[data-found="true"]')).toHaveCount(1);
  await page.setViewportSize({ width: 360, height: 1000 });
  await expect(board).toHaveAttribute('data-round', round!);
  expect(
    await page
      .locator('.seek-hidden-item')
      .evaluateAll((items) => items.map((el) => el.getAttribute('style'))),
  ).toEqual(before);
  await page.getByRole('button', { name: 'Xem cách chơi', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('bức tranh');
  await page.keyboard.press('Escape');
  await expect(page.locator('.seek-hidden-item[data-found="true"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Bộ sưu tập 0 trên/ })).toBeVisible();
});
for (const width of [360, 768, 1440])
  test(`K08 discovery responsive/axe/44px targets at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1100 });
    await startNumbers(page, 10);
    for (const exercise of ['number-search', 'hide-and-seek']) {
      if (exercise === 'hide-and-seek') await startSeek(page, 'ocean');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.violations).toEqual([]);
      const small = await page.getByRole('button').evaluateAll((items) =>
        items
          .filter((el) => {
            const b = el.getBoundingClientRect();
            return b.width > 0 && b.height > 0 && (b.width < 43.9 || b.height < 43.9);
          })
          .map((el) => el.getAttribute('aria-label') || el.textContent),
      );
      expect(small).toEqual([]);
      await page.getByRole('button', { name: 'Xem cách chơi', exact: true }).click();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.keyboard.press('Escape');
    }
  });
