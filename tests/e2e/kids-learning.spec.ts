import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const base = '/projects/kids-learning';
const pairs = [
  'bee',
  'dog',
  'cow',
  'child',
  'rabbit',
  'cat',
  'duck',
  'bird',
  'car',
  'school-child',
  'cyclist',
];
const actions = [
  'Ong hút mật',
  'Chó gặm xương',
  'Bò ăn cỏ',
  'Bạn nhỏ vào nhà',
  'Thỏ ăn cà rốt',
  'Mèo ăn cá',
  'Vịt bơi trong ao',
  'Chim về tổ',
  'Ô tô gia đình về đến nhà',
  'Bạn nhỏ vào trường học',
  'Bạn nhỏ đỗ xe ở công viên',
];
const patterns = ['straight', 'zigzag', 'wave'];
test.use({ viewport: { width: 1280, height: 1100 } });
declare global {
  interface Window {
    kidsTestVoices: HTMLAudioElement[];
  }
}

/** RNG cố định chỉ trong browser test; mọi đề vẫn được tạo qua nút Bắt đầu và code runtime thật. */
async function prepareTrace(page: Page, c = 0, p = 0, level = 'easy') {
  await page.goto(base + '/tracing');
  await expect(page.getByRole('heading', { name: 'Đồ nét vui nhộn', exact: true })).toBeVisible();
  await page.getByLabel('Độ khó').selectOption(level);
  await page.evaluate(
    ([c, p, pairCount]) => {
      const sequence = [(c + 0.1) / pairCount, (p + 0.1) / 3, 0.1];
      let i = 0;
      Math.random = () => sequence[i++ % 3];
    },
    [c, p, pairs.length],
  );
  await page.getByRole('button', { name: /Bắt đầu/ }).click();
  await expect(page.locator('.tracing-card')).toHaveAttribute('data-companion', pairs[c]);
  await expect(page.locator('.tracing-card')).toHaveAttribute('data-pattern', patterns[p]);
}
/** Đọc hình học mẫu trên UI rồi di chuyển chuột thật; không gọi grader hoặc dispatch hoàn thành. */
async function guidePoints(page: Page, fraction = 1) {
  await page.locator('.tracing-paper').scrollIntoViewIfNeeded();
  return page.locator('.tracing-guide').evaluate((el, fraction) => {
    const path = el as SVGPathElement;
    const b = path.ownerSVGElement!.getBoundingClientRect(),
      length = path.getTotalLength();
    return Array.from({ length: 65 }, (_, i) => {
      const p = path.getPointAtLength((length * fraction * i) / 64);
      return { x: b.x + p.x, y: b.y + p.y };
    });
  }, fraction);
}
async function drawGuide(page: Page, fraction = 1, shortcut = false) {
  let points = await guidePoints(page, fraction);
  if (shortcut) points = [points[0], points.at(-1)!];
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y);
  await page.mouse.up();
}
async function matchStart(page: Page, end = 3) {
  await page.goto(base + '/matching');
  await page.getByLabel('Đến số', { exact: true }).fill(String(end));
  await page.getByRole('button', { name: /Bắt đầu/ }).click();
}
async function matchDraw(page: Page, source: number, target: number, loop = false) {
  await page.locator('.matching-paper').scrollIntoViewIfNeeded();
  const a = (await page.locator(`[data-source="${source}"]`).boundingBox())!,
    b = (await page.locator(`[data-target="${target}"]`).boundingBox())!;
  const start = { x: a.x + a.width / 2, y: a.y + a.height / 2 },
    end = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  if (loop) {
    await page.mouse.move(start.x + 80, start.y + 40, { steps: 4 });
    await page.mouse.move(start.x + 40, start.y - 30, { steps: 4 });
    await page.mouse.move(start.x + 90, start.y + 30, { steps: 4 });
  }
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();
}
async function completeMatching(page: Page, end = 2) {
  await matchStart(page, end);
  for (let n = 1; n <= end; n++) {
    await page.getByRole('button', { name: `Chọn số ${n}`, exact: true }).click();
    await page.getByRole('button', { name: `Nối tới nhóm ${n} hình`, exact: true }).click();
  }
  await expect(page.getByRole('button', { name: /Bộ sưu tập 1 trên/ })).toBeVisible();
}
async function trackVoices(page: Page) {
  await page.addInitScript(() => {
    window.kidsTestVoices = [];
    const Native = window.Audio;
    window.Audio = class extends Native {
      constructor(src?: string) {
        super(src);
        window.kidsTestVoices.push(this);
      }
    };
  });
}

test('L19 seventh portfolio card, direct/reload/Back and lazy child feature', async ({ page }) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.project-card')).toHaveCount(7);
  expect(requests.some((u) => u.includes('features/kids-learning'))).toBe(false);
  await page.locator('.project-kids-learning').click();
  await expect(page.locator('.learning-menu-card')).toHaveCount(4);
  await page.locator('.learning-menu-card.matching').click();
  await expect(page).toHaveURL(base + '/matching');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Nối số với hình', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Đồ nét', exact: true }).click();
  await expect(page).toHaveURL(base + '/tracing');
  await page.goBack();
  await expect(page).toHaveURL(base + '/matching');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base + '/tracing/');
  await page.getByRole('button', { name: 'Nghe hướng dẫn', exact: true }).click();
  await expect
    .poll(() => requests.some((url) => url.includes('/audio/kids-learning/tracing.mp3')))
    .toBe(true);
  await page.getByRole('button', { name: 'Xem cách chơi', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Đặt bút ở chấm xanh');
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});
test('L27 range corrections, presets and ten exact groups never use stale draft', async ({
  page,
}) => {
  await page.goto(base + '/matching');
  const start = page.getByLabel('Từ số', { exact: true }),
    end = page.getByLabel('Đến số', { exact: true });
  await start.fill('7');
  await end.focus();
  await expect(start).toHaveValue('4');
  await expect(end).toHaveValue('5');
  await end.fill('2');
  await start.focus();
  await expect(end).toHaveValue('5');
  await start.fill('9');
  await page.getByRole('button', { name: '1–10', exact: true }).click();
  await expect(start).toHaveValue('1');
  await expect(end).toHaveValue('10');
  await expect(page.locator('.matching-board')).toHaveCount(0);
  await page.getByRole('button', { name: /Bắt đầu/ }).click();
  await expect(page.locator('[data-source]')).toHaveCount(10);
  for (let n = 1; n <= 10; n++)
    await expect(page.locator(`[data-count="${n}"] .count-grid img`)).toHaveCount(n);
  await end.fill('3.5');
  await page.getByRole('button', { name: /Bắt đầu/ }).click();
  await expect(end).toHaveValue('2');
  await expect(page.locator('[data-source]')).toHaveCount(2);
});
test('L27 real noisy stroke becomes one rounded curve; wrong replaces, correct locks and rewards once', async ({
  page,
}) => {
  await matchStart(page);
  await matchDraw(page, 1, 2, true);
  await expect(page.locator('.matching-connection.wrong')).toHaveCount(1);
  await matchDraw(page, 1, 1, true);
  await expect(page.locator('.matching-connection.wrong')).toHaveCount(0);
  const line = page.locator('.matching-connection.correct[data-source-id="1"]');
  const d = (await line.getAttribute('d'))!;
  expect(d.match(/M/g)).toHaveLength(1);
  expect(d.match(/C/g)).toHaveLength(1);
  expect(d).not.toContain('L');
  await expect(page.getByRole('button', { name: 'Chọn số 1', exact: true })).toBeDisabled();
  await matchDraw(page, 1, 3);
  await expect(line).toHaveAttribute('d', d);
  const round = await page.locator('.matching-board').getAttribute('data-round');
  await page.setViewportSize({ width: 768, height: 1100 });
  await expect(page.locator('.matching-board')).toHaveAttribute('data-round', round!);
  await expect(page.locator('.matching-connection.correct')).toHaveCount(1);
  await expect(line).not.toHaveAttribute('d', d);
  await matchDraw(page, 2, 2);
  await matchDraw(page, 3, 3);
  await expect(page.locator('.matching-connection.correct')).toHaveCount(3);
  await expect(page.locator('.matching-connection.wrong')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Bộ sưu tập 1 trên/ })).toBeVisible();
});
test('L27 count taps and tutorial cannot choose answers or change real round', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await matchStart(page);
  const round = await page.locator('.matching-board').getAttribute('data-round');
  const picture = page.getByRole('button', { name: 'Đếm hình 1 trong nhóm 3', exact: true });
  await picture.click();
  await picture.click();
  await expect(page.getByRole('button', { name: 'Đếm lại nhóm 3', exact: true })).toContainText(
    'Đã đếm 1',
  );
  await expect(page.locator('.matching-connection')).toHaveCount(0);
  await matchDraw(page, 1, 2);
  const wrong = await page.locator('.matching-connection.wrong').getAttribute('d');
  const opener = page.getByRole('button', { name: 'Xem cách chơi', exact: true });
  await opener.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(
    page.getByRole('button', { name: 'Đã hiểu, cùng thử nào', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await expect(page.locator('.matching-board')).toHaveAttribute('data-round', round!);
  await expect(page.locator('.matching-connection.wrong')).toHaveAttribute('d', wrong!);
  await expect(page.getByRole('button', { name: 'Đếm lại nhóm 3', exact: true })).toContainText(
    'Đã đếm 1',
  );
  await expect(page.getByRole('button', { name: /Bộ sưu tập 0 trên/ })).toBeVisible();
});
test('L27 native touch cancel leaves no garbage, pen pointer can connect', async ({ page }) => {
  await matchStart(page, 2);
  await page.locator('.matching-paper').scrollIntoViewIfNeeded();
  const a = (await page.locator('[data-source="1"]').boundingBox())!,
    b = (await page.locator('[data-target="1"]').boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const x = a.x + a.width / 2,
    y = a.y + a.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x + 25, y: y + 20 }],
  });
  await expect(page.getByTestId('learning-live')).toBeVisible();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.getByTestId('learning-live')).toHaveCount(0);
  await expect(page.locator('.matching-connection')).toHaveCount(0);
  for (const event of [
    { type: 'mouseMoved', x, y },
    { type: 'mousePressed', x, y },
    { type: 'mouseMoved', x: b.x + b.width / 2, y: b.y + b.height / 2 },
    { type: 'mouseReleased', x: b.x + b.width / 2, y: b.y + b.height / 2 },
  ])
    await cdp.send('Input.dispatchMouseEvent', {
      ...event,
      pointerType: 'pen',
      button: 'left',
      clickCount: 1,
      buttons: event.type === 'mouseReleased' ? 0 : 1,
    });
  await expect(page.locator('.matching-connection.correct')).toHaveCount(1);
});
test('L21 Easy default freezes current profile, new round changes, reload returns Easy', async ({
  page,
}) => {
  await prepareTrace(page);
  const round = await page.locator('.tracing-card').getAttribute('data-round');
  await page.getByLabel('Độ khó').selectOption('medium');
  await expect(page.locator('.tracing-card')).toHaveAttribute('data-level', 'easy');
  await expect(page.locator('.tracing-card')).toHaveAttribute('data-round', round!);
  await page.getByRole('button', { name: /Bài tiếp/ }).click();
  await expect(page.locator('.tracing-card')).toHaveAttribute('data-level', 'medium');
  await page.reload();
  await expect(page.getByLabel('Độ khó')).toHaveValue('easy');
});
for (let c = 0; c < pairs.length; c++)
  for (const p of c < 4 ? [0, 1, 2] : [c % patterns.length])
    for (const level of c < 4 ? ['easy', 'medium'] : ['easy']) {
      test(`L28 ${pairs[c]}/${patterns[p]}/${level} real tracing, animation and same-round restoration`, async ({
        page,
      }) => {
        await trackVoices(page);
        await prepareTrace(page, c, p, level);
        await expect
          .poll(() =>
            page.evaluate(
              (id) =>
                window.kidsTestVoices.some(
                  (v) => v.src.includes('/' + id + '.mp3') && !v.paused && v.currentTime > 0.05,
                ),
              pairs[c],
            ),
          )
          .toBe(true);
        const round = await page.locator('.tracing-card').getAttribute('data-round');
        const path = await page.locator('.tracing-guide').getAttribute('d');
        if (p !== 0) {
          await drawGuide(page, 1, true);
          await expect(page.locator('.tracing-card')).toHaveAttribute('data-phase', 'retry');
          await expect(page.locator('.lesson-animation')).toHaveCount(0);
        }
        await drawGuide(page);
        const scene = page.locator('.lesson-animation');
        await expect(scene).toHaveAttribute('data-scene', pairs[c]);
        const actor = scene.locator('.lesson-actor');
        if (pairs[c] === 'car' || pairs[c] === 'cyclist') {
          await expect(actor.locator('.actor-paws')).toHaveCount(0);
          expect(
            await actor
              .locator('.actor-wheels')
              .evaluate((el) => getComputedStyle(el, '::before').animationName),
          ).toBe('learning-roll');
        }
        await expect(scene).toHaveAttribute('data-stage', 'arrived', { timeout: 12000 });
        await expect(scene.locator('.animation-caption')).toHaveText(actions[c]);
        if (pairs[c] === 'car' || pairs[c] === 'cyclist')
          expect(
            await actor
              .locator('.actor-wheels')
              .evaluate((el) => getComputedStyle(el, '::before').animationPlayState),
          ).toBe('paused');
        await expect(page.locator('.tracing-card')).toHaveAttribute('data-phase', 'completed', {
          timeout: 15000,
        });
        await expect(page.locator('.tracing-card')).toHaveAttribute('data-round', round!);
        await expect(page.locator('.tracing-guide')).toHaveAttribute('d', path!);
        await expect(page.getByRole('button', { name: /Bộ sưu tập 1 trên/ })).toBeVisible();
        if (c === 0 && p === 0 && level === 'easy') {
          await page.getByRole('button', { name: 'Vẽ lại', exact: true }).click();
          await expect(page.locator('.tracing-card')).toHaveAttribute('data-round', round!);
          await drawGuide(page);
          await expect(page.locator('.tracing-card')).toHaveAttribute('data-phase', 'completed', {
            timeout: 15000,
          });
          await expect(page.getByRole('button', { name: /Bộ sưu tập 1 trên/ })).toBeVisible();
          await page.getByRole('button', { name: /Bài tiếp/ }).click();
          await expect(page.locator('.tracing-card')).not.toHaveAttribute('data-round', round!);
        }
      });
    }
test('slow journey follows the accepted stroke, resizes without restarting and acts at the end', async ({
  page,
}) => {
  await prepareTrace(page, 1, 0);
  const round = await page.locator('.tracing-card').getAttribute('data-round');
  const points = await guidePoints(page);
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (let i = 1; i < points.length; i++)
    await page.mouse.move(
      points[i].x,
      points[i].y + 10 * Math.sin((Math.PI * i) / (points.length - 1)),
    );
  await page.mouse.up();
  const scene = page.locator('.lesson-animation');
  const actor = scene.locator('.lesson-actor');
  await expect(scene).toHaveAttribute('data-stage', 'traveling');
  // Nét được nhận lệch nhẹ so với mẫu thẳng: hoạt cảnh phải giữ nét của trẻ, không dùng lại mẫu.
  expect(
    await scene.locator('.animation-trail').evaluate((el) => {
      const path = el as SVGPathElement;
      return path.getPointAtLength(path.getTotalLength() / 2).y;
    }),
  ).toBeGreaterThan(127);
  await expect
    .poll(() => actor.evaluate((el) => Number(el.getAnimations()[0].currentTime)))
    .toBeGreaterThan(3000);
  await expect(scene).toHaveAttribute('data-stage', 'traveling');
  const progress = await actor.evaluate((el) => parseFloat(getComputedStyle(el).offsetDistance));
  expect(progress).toBeGreaterThan(20);
  expect(progress).toBeLessThan(65);
  const elapsed = await actor.evaluate((el) => Number(el.getAnimations()[0].currentTime));
  const oldPath = await scene.locator('.animation-trail').getAttribute('d');
  await page.setViewportSize({ width: 768, height: 1100 });
  await expect(scene.locator('.animation-trail')).not.toHaveAttribute('d', oldPath!);
  const resumed = await actor.evaluate((el) => Number(el.getAnimations()[0].currentTime));
  expect(resumed).toBeGreaterThanOrEqual(elapsed - 100);
  expect(resumed).toBeLessThan(elapsed + 1500);
  // Kiểm tâm nhân vật thực trên motion path, thay vì chỉ kiểm CSS/keyframe đã khai báo.
  expect(
    await scene.evaluate((el) => {
      const actor = el.querySelector('.lesson-actor')!;
      const path = el.querySelector('.animation-trail') as SVGPathElement;
      const progress = parseFloat(getComputedStyle(actor).offsetDistance) / 100;
      const point = path.getPointAtLength(path.getTotalLength() * progress);
      const svg = path.ownerSVGElement!.getBoundingClientRect();
      const box = actor.getBoundingClientRect();
      return Math.hypot(
        box.x + box.width / 2 - svg.x - point.x,
        box.y + box.height / 2 - svg.y - point.y,
      );
    }),
  ).toBeLessThan(2);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(scene).toHaveAttribute('data-paused', 'true');
  // pause() được trình duyệt chốt ở frame kế tiếp; đo sau ready để không tính frame đang chờ.
  await actor.evaluate(async (el) => {
    await el.getAnimations()[0].ready;
  });
  const paused = await actor.evaluate((el) => Number(el.getAnimations()[0].currentTime));
  await page.waitForTimeout(300);
  expect(await actor.evaluate((el) => Number(el.getAnimations()[0].currentTime))).toBeCloseTo(
    paused,
    0,
  );
  expect(await actor.locator('img').evaluate((el) => getComputedStyle(el).animationPlayState)).toBe(
    'paused',
  );
  expect(
    await actor
      .locator('.actor-paws')
      .evaluate((el) => getComputedStyle(el, '::before').animationPlayState),
  ).toBe('paused');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(scene).toHaveAttribute('data-stage', 'arrived', { timeout: 10000 });
  await expect(scene.locator('.animation-caption')).toHaveText('Chó gặm xương');
  await expect(actor).toHaveClass(/feeding/);
  await page.waitForTimeout(1200);
  await expect(scene).toHaveAttribute('data-stage', 'arrived');
  await expect(page.locator('.tracing-card')).toHaveAttribute('data-phase', 'completed', {
    timeout: 5000,
  });
  await expect(page.locator('.tracing-card')).toHaveAttribute('data-round', round!);
  const restored = await page.locator('.tracing-attempt.correct').evaluate((el) => {
    const path = el as SVGPathElement;
    const box = path.getBBox();
    return {
      right: box.x + box.width,
      expectedRight: path.ownerSVGElement!.viewBox.baseVal.width - 32,
      middleY: path.getPointAtLength(path.getTotalLength() / 2).y,
    };
  });
  expect(restored.right).toBeCloseTo(restored.expectedRight, 0);
  expect(restored.middleY).toBeGreaterThan(127);
  await expect(page.getByRole('button', { name: /Bộ sưu tập 1 trên/ })).toBeVisible();
});
test('L28 keyboard pen uses actual coordinates and the same grader', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepareTrace(page);
  const points = await guidePoints(page);
  const steps = Math.round((points.at(-1)!.x - points[0].x) / 4);
  const board = page.getByRole('application');
  await board.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('Space');
  for (let i = 0; i < steps; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.locator('.tracing-card')).toHaveAttribute('data-phase', 'completed', {
    timeout: 15000,
  });
  await expect(page.getByRole('button', { name: 'Vẽ lại', exact: true })).toBeFocused();
});
test('L28 native touch follows a wave; hiding pauses a real animation; route leave cancels', async ({
  page,
}) => {
  await prepareTrace(page, 1, 2);
  const points = await guidePoints(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [points[0]] });
  for (const p of points.slice(1))
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('.lesson-animation')).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(3300);
  await expect(page.locator('.tracing-card')).toHaveAttribute('data-phase', 'animating');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.tracing-card')).toHaveAttribute('data-phase', 'completed', {
    timeout: 15000,
  });
  await page.getByRole('button', { name: 'Vẽ lại', exact: true }).click();
  await drawGuide(page);
  await expect(page.locator('.lesson-animation')).toBeVisible();
  await page.getByRole('link', { name: '← Chọn bài', exact: true }).click();
  await expect(page.locator('.lesson-animation')).toHaveCount(0);
  await expect(page.locator('.learning-menu-card')).toHaveCount(4);
});
test('L23 fifty-two Vietnamese clips decode, play natively, never overlap, mute persists', async ({
  page,
}) => {
  await trackVoices(page);
  await page.goto(base + '/matching');
  const clips = await page.evaluate(async () => {
    const manifest = await (await fetch('/audio/kids-learning/manifest.json')).json();
    const context = new AudioContext();
    try {
      const result = [];
      for (const clip of manifest.clips) {
        const buffer = await context.decodeAudioData(
          await (await fetch('/audio/kids-learning/' + clip.id + '.mp3')).arrayBuffer(),
        );
        result.push({
          duration: buffer.duration,
          audible: buffer.getChannelData(0).some((n) => Math.abs(n) > 0.01),
        });
      }
      return result;
    } finally {
      await context.close();
    }
  });
  expect(clips).toHaveLength(52);
  expect(clips.every((c) => c.duration > 1 && c.audible)).toBe(true);
  await page.getByRole('button', { name: /Bắt đầu/ }).click();
  await expect
    .poll(() =>
      page.evaluate(() => window.kidsTestVoices.some((v) => !v.paused && v.currentTime > 0.1)),
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Nghe hướng dẫn', exact: true }).click();
  expect(
    await page.evaluate(() => window.kidsTestVoices.filter((v) => !v.paused).length),
  ).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Tắt âm thanh', exact: true }).click();
  expect(await page.evaluate(() => window.kidsTestVoices.every((v) => v.paused))).toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Bật âm thanh', exact: true })).toBeVisible();
});
test('L23 audio errors/retry never prevent drawing or lose work', async ({ page }) => {
  await trackVoices(page);
  await page.route('**/audio/kids-learning/matching.mp3*', (r) => r.abort('failed'));
  await matchStart(page, 2);
  await expect(page.locator('.learning-audio-error')).toBeVisible();
  await page.unroute('**/audio/kids-learning/matching.mp3*');
  await page.getByRole('button', { name: 'Nghe lại', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => window.kidsTestVoices.some((v) => v.currentTime > 0.1 && !v.paused)),
    )
    .toBe(true);
  await matchDraw(page, 1, 1);
  await expect(page.locator('.matching-connection.correct')).toHaveCount(1);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.kidsTestVoices.some(
          (v) => v.src.includes('/success.mp3') && !v.paused && v.currentTime > 0.05,
        ),
      ),
    )
    .toBe(true);
  await page.getByRole('link', { name: '← Chọn bài', exact: true }).click();
  await expect(page.locator('.learning-menu-card')).toHaveCount(4);
  await expect
    .poll(() => page.evaluate(() => window.kidsTestVoices.every((v) => v.paused)), {
      timeout: 1000,
    })
    .toBe(true);
});
test('L25 real completion saves one sticker, reload restores only collection, corrupted storage is safe', async ({
  page,
}) => {
  await completeMatching(page);
  await page.reload();
  await expect(page.getByRole('button', { name: /Bộ sưu tập 1 trên/ })).toBeVisible();
  await expect(page.locator('.matching-board')).toHaveCount(0);
  await page.getByRole('button', { name: /Bộ sưu tập/ }).click();
  await expect(page.locator('.collection-sticker.unlocked')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.evaluate(() =>
    localStorage.setItem('project-codex:kids-learning:stickers:v1', '{bad'),
  );
  await page.reload();
  await expect(page.getByRole('button', { name: /Bộ sưu tập 0 trên/ })).toBeVisible();
});
test('L25 blocked storage/quota keeps in-session stickers and lesson usable', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
  });
  await completeMatching(page);
  await page.getByRole('button', { name: /Bộ sưu tập/ }).click();
  await expect(page.getByText('Sticker đang được giữ trong phiên chơi này nhé.')).toBeVisible();
  await expect(page.locator('.collection-sticker.unlocked')).toHaveCount(1);
});
test('L19 offline/recovery preserves round and correct line', async ({ page, context }) => {
  await matchStart(page);
  await matchDraw(page, 1, 1);
  const round = await page.locator('.matching-board').getAttribute('data-round');
  await context.setOffline(true);
  await expect(page.locator('.service-banner')).toBeVisible();
  await expect(page.locator('.matching-connection.correct')).toHaveCount(1);
  await context.setOffline(false);
  await expect(page.locator('.service-banner')).toHaveCount(0);
  await expect(page.locator('.matching-board')).toHaveAttribute('data-round', round!);
  await expect(page.locator('.matching-connection.correct')).toHaveCount(1);
});
for (const width of [360, 768, 1440])
  test(`L26 responsive/axe/focus menu, ten pairs, tracing and dialogs at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    async function audit() {
      const small = await page
        .locator(
          '.learning-app a,.learning-app button,.learning-app input,.learning-app select,.learning-app summary',
        )
        .evaluateAll((elements) =>
          elements
            .filter((el) => !el.closest('[inert]') && el.getClientRects().length > 0)
            .map((el) => {
              const rect = el.getBoundingClientRect();
              return {
                name: el.getAttribute('aria-label') || el.textContent,
                width: rect.width,
                height: rect.height,
              };
            })
            .filter((box) => box.width < 43.9 || box.height < 43.9),
        );
      expect(small).toEqual([]);

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      ).toEqual([]);
    }
    for (const route of ['', '/matching', '/tracing']) {
      await page.goto(base + route);
      await expect(page.locator('.learning-brand')).toBeVisible();
      if (route) {
        if (route === '/matching')
          await page.getByRole('button', { name: '1–10', exact: true }).click();
        await page.getByRole('button', { name: /Bắt đầu/ }).click();
      }
      await audit();
      if (route) {
        await page.getByRole('button', { name: 'Xem cách chơi', exact: true }).click();
        await audit();
        await page.keyboard.press('Escape');
      }
    }
    await page.getByRole('button', { name: /Bộ sưu tập/ }).click();
    await audit();
    await page.keyboard.press('Escape');
  });
