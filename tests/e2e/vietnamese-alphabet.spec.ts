import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { alphabet } from '../../apps/web/src/features/vietnamese-alphabet/alphabet-data';

declare global {
  interface Window {
    alphabetTestAudios: HTMLAudioElement[];
    alphabetEndedAt: number;
  }
}
const path = '/projects/vietnamese-alphabet';

/** Theo dõi audio native thật; không thay decoder/play/ended hoặc thêm endpoint vào ứng dụng. */
async function trackAudio(page: Page) {
  await page.addInitScript(() => {
    window.alphabetTestAudios = [];
    window.alphabetEndedAt = 0;
    const NativeAudio = window.Audio;
    window.Audio = class extends NativeAudio {
      constructor(url?: string) {
        super(url);
        window.alphabetTestAudios.push(this);
        this.addEventListener('ended', () => {
          window.alphabetEndedAt = performance.now();
        });
      }
    };
  });
}

test('sixth portfolio card, direct URL/reload,29 ordered letters and matching images', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.project-card')).toHaveCount(6);
  await page.locator('.project-vietnamese-alphabet').click();
  await expect(page).toHaveURL(path);
  await expect(page.locator('.alphabet-card')).toHaveCount(29);
  expect(
    await page
      .locator('.alphabet-card')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label'))),
  ).toEqual(alphabet.map((letter) => `Học chữ ${letter.letter}: ${letter.example}`));
  for (const letter of alphabet) {
    const card = page.getByRole('button', {
      name: `Học chữ ${letter.letter}: ${letter.example}`,
      exact: true,
    });
    await expect(card.locator('img')).toHaveAttribute('src', `/images/alphabet/${letter.id}.svg`);
    await expect(card.locator('mark').first()).toBeVisible();
  }
  await page.reload();
  await expect(page.locator('.alphabet-card')).toHaveCount(29);
  await page.getByRole('link', { name: 'Portfolio', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(6);
});

test('all29 bundled Vietnamese recordings really decode and illustrations/font load locally', async ({
  page,
}) => {
  const remote: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:5174') remote.push(request.url());
  });
  await page.goto(path);
  await expect(page.locator('.alphabet-card')).toHaveCount(29);
  const decoded = await page.evaluate(
    async (ids) => {
      const decoder = new OfflineAudioContext(1, 1, 24000);
      return Promise.all(
        ids.map(async (id) => {
          const response = await fetch(`/audio/vietnamese-alphabet/${id}.mp3`);
          if (!response.ok || !response.headers.get('content-type')?.includes('audio/mpeg'))
            throw new Error(`Missing audio ${id}`);
          const data = await decoder.decodeAudioData(await response.arrayBuffer());
          return {
            id,
            duration: data.duration,
            samples: data.length,
            audible: data.getChannelData(0).some((sample) => Math.abs(sample) > 0.01),
          };
        }),
      );
    },
    alphabet.map((letter) => letter.id),
  );
  expect(decoded).toHaveLength(29);
  for (const clip of decoded) {
    expect(clip.duration, clip.id).toBeGreaterThan(2);
    expect(clip.duration, clip.id).toBeLessThan(15);
    expect(clip.audible, clip.id).toBe(true);
  }
  await page.locator('.alphabet-card').last().scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator('.alphabet-card img')
        .evaluateAll((nodes) =>
          nodes.every(
            (node) =>
              (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => document.fonts.check('900 24px "Nunito Alphabet"', 'ă â đ ê ô ơ ư')),
  ).toBe(true);
  expect(remote).toEqual([]);
});

test('real Vietnamese audio plays once; popup stays during reading and closes3 seconds after native ended', async ({
  page,
}) => {
  await trackAudio(page);
  await page.goto(path);
  const card = page.getByRole('button', { name: 'Học chữ ă: cặp sách', exact: true });
  await card.click();
  const dialog = page.getByRole('dialog', { name: 'Chữ ă — cặp sách', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('status')).toContainText('Cùng nghe');
  await expect(dialog.locator('mark').first()).toHaveText('ặ');
  await expect(dialog.getByRole('status')).toContainText('đóng sau 3 giây');
  const endedAt = await page.evaluate(() => window.alphabetEndedAt);
  expect(endedAt).toBeGreaterThan(0);
  await page.waitForTimeout(1400);
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toBeVisible();
  const after = await page.evaluate(() => ({
    now: performance.now(),
    audios: window.alphabetTestAudios.length,
    paused: window.alphabetTestAudios[0].paused,
  }));
  expect(after.now - endedAt).toBeGreaterThanOrEqual(2900);
  expect(after.now - endedAt).toBeLessThan(5500);
  expect(after.audios).toBe(1);
  expect(after.paused).toBe(true);
  await expect(card).toBeFocused();
});

test('slow audio does not start the close timer while loading', async ({ page }) => {
  let allow!: () => void;
  const held = new Promise<void>((resolve) => {
    allow = resolve;
  });
  await page.route('**/audio/vietnamese-alphabet/a.mp3', async (route) => {
    await held;
    await route.continue();
  });
  await page.goto(path);
  await page.getByRole('button', { name: 'Học chữ a: cái ca', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('status')).toContainText('chuẩn bị');
  await page.waitForTimeout(3500);
  await expect(dialog).toBeVisible();
  allow();
  await expect(dialog.getByRole('status')).toContainText('Cùng nghe');
  await expect(dialog.getByRole('status')).toContainText('đóng sau 3 giây');
  await expect(dialog).not.toBeVisible();
});

test('failed audio keeps the card open and retry plays the same Vietnamese clip', async ({
  page,
}) => {
  await trackAudio(page);
  await page.route('**/audio/vietnamese-alphabet/m.mp3', (route) => route.abort('failed'));
  await page.goto(path);
  await page.getByRole('button', { name: 'Học chữ m: con mèo', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toContainText('Chưa phát được');
  await page.waitForTimeout(3500);
  await expect(dialog).toBeVisible();
  await page.unroute('**/audio/vietnamese-alphabet/m.mp3');
  await dialog.getByRole('button', { name: 'Thử phát lại' }).click();
  await expect(dialog.getByRole('status')).toContainText('Cùng nghe');
  await expect(dialog.getByRole('status')).toContainText('đóng sau 3 giây');
  await expect(dialog).not.toBeVisible();
  expect(
    await page.evaluate(() =>
      window.alphabetTestAudios.map((audio) => ({
        url: new URL(audio.src).pathname,
        paused: audio.paused,
      })),
    ),
  ).toEqual([
    { url: '/audio/vietnamese-alphabet/m.mp3', paused: true },
    { url: '/audio/vietnamese-alphabet/m.mp3', paused: true },
  ]);
});

test('keyboard, Escape/backdrop, focus restoration and changing cards never overlap voices', async ({
  page,
}) => {
  await trackAudio(page);
  await page.goto(path);
  const card = page.getByRole('button', { name: 'Học chữ b: con bò', exact: true });
  await card.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Đóng thẻ' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Đóng thẻ' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(card).toBeFocused();
  expect(await page.evaluate(() => window.alphabetTestAudios[0].paused)).toBe(true);
  await page.getByRole('button', { name: 'Học chữ y: cái cây', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Chữ y — cái cây' })).toBeVisible();
  expect(
    await page.evaluate(() => window.alphabetTestAudios.filter((audio) => !audio.paused).length),
  ).toBeLessThanOrEqual(1);
  await page.mouse.click(5, 5);
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => window.alphabetTestAudios.every((audio) => audio.paused))).toBe(
    true,
  );
});

test('leaving the route or hiding the tab cancels the voice and popup', async ({ page }) => {
  await trackAudio(page);
  await page.goto(path);
  await page.getByRole('button', { name: 'Học chữ a: cái ca', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(() => {
    history.pushState(null, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.locator('.project-card')).toHaveCount(6);
  expect(await page.evaluate(() => window.alphabetTestAudios.every((audio) => audio.paused))).toBe(
    true,
  );
  await page.locator('.project-vietnamese-alphabet').click();
  await page.getByRole('button', { name: 'Học chữ a: cái ca', exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => window.alphabetTestAudios.every((audio) => audio.paused))).toBe(
    true,
  );
});

for (const width of [360, 768, 1440])
  test(`bright responsive board/dialog is accessible at${width}px`, async ({ page }) => {
    await trackAudio(page);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(path);
    await expect(page.locator('.alphabet-card')).toHaveCount(29);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const board = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      board.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
    await page.getByRole('button', { name: 'Học chữ ư: sư tử', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Giữ dialog trong lúc axe quét; decoder/play thật đã được kiểm tra độc lập ở trên.
    await page.evaluate(() => window.alphabetTestAudios.at(-1)?.pause());
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(Math.abs(box!.x + box!.width / 2 - width / 2)).toBeLessThan(2);
    expect(Math.abs(box!.y + box!.height / 2 - 450)).toBeLessThan(2);
    const modal = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      modal.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
    await dialog.getByRole('button', { name: 'Đóng thẻ' }).click();
    expect(errors).toEqual([]);
  });
