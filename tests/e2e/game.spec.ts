import { test, expect } from '@playwright/test';
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
test.afterAll(() => pool.end());
test('mismatched cards block the third flip and hide after cooldown', async ({ page }) => {
  await page.goto('/projects/memory-match');
  await page.getByRole('button', { name: 'Bắt đầu chơi', exact: true }).first().click();
  await expect(page.getByRole('button', { name: /^Thẻ / })).toHaveCount(12);
  const session = await page.evaluate(() => JSON.parse(sessionStorage.getItem('memory-session')!));
  try {
    const state = (await pool.query('SELECT state FROM game_sessions WHERE id=$1', [session.id]))
      .rows[0].state as { deck: { id: string; face: number }[] };
    const first = state.deck[0],
      second = state.deck.find((c) => c.face !== first.face)!;
    await page.getByRole('button', { name: 'Thẻ 1', exact: true }).click();
    await expect(page.locator('.memory-card.revealed')).toHaveCount(1);
    await page
      .getByRole('button', { name: `Thẻ ${Number(second.id.slice(1)) + 1}`, exact: true })
      .click();
    await expect(page.locator('.memory-card.revealed')).toHaveCount(2);
    await expect(
      page
        .locator('.memory-card')
        .filter({ has: page.locator('.card-back') })
        .first(),
    ).toBeDisabled();
    await expect(page.locator('.memory-card.revealed')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Thẻ 1', exact: true })).toBeEnabled();
    expect(
      (await pool.query('SELECT state FROM game_sessions WHERE id=$1', [session.id])).rows[0].state
        .moves,
    ).toBe(1);
  } finally {
    await pool.query('DELETE FROM game_sessions WHERE id=$1', [session.id]);
  }
});
test('play with keyboard, finish, save leaderboard and recover session after reload', async ({
  page,
}) => {
  await page.goto('/projects/memory-match');
  await page.getByRole('button', { name: 'Bắt đầu chơi', exact: true }).first().click();
  await expect(page.getByRole('button', { name: /^Thẻ / })).toHaveCount(12);
  const session = (await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('memory-session')!),
  )) as { id: string; token: string };
  try {
    const state = (await pool.query('SELECT state FROM game_sessions WHERE id=$1', [session.id]))
      .rows[0].state as { deck: { id: string; face: number }[] };
    const groups = new Map<number, string[]>();
    for (const c of state.deck) groups.set(c.face, [...(groups.get(c.face) || []), c.id]);
    const first = state.deck[0];
    await page.getByRole('button', { name: 'Thẻ 1', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: new RegExp('^Thẻ 1, mặt') })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: new RegExp('^Thẻ 1, mặt') })).toBeVisible();
    const pair = groups.get(first.face)!;
    const second = pair.find((id) => id !== first.id)!;
    await page
      .getByRole('button', { name: `Thẻ ${Number(second.slice(1)) + 1}`, exact: true })
      .click();
    await expect(page.locator('.memory-card.matched')).toHaveCount(2);
    groups.delete(first.face);
    let matched = 2;
    for (const cards of groups.values()) {
      for (const card of cards) {
        await page
          .getByRole('button', { name: `Thẻ ${Number(card.slice(1)) + 1}`, exact: true })
          .click();
        await expect
          .poll(async () => page.locator('.memory-card.revealed').count())
          .toBeGreaterThan(0);
      }
      matched += 2;
      await expect(page.locator('.memory-card.matched')).toHaveCount(matched);
    }
    await expect(page.getByRole('heading', { name: 'Bạn đã tìm đủ các cặp!' })).toBeVisible();
    const nick = `<E2E-${Date.now()}>`;
    await page.getByLabel('Tên trên bảng xếp hạng').fill(nick);
    await page.getByRole('button', { name: 'Lưu thành tích' }).click();
    await expect(page.getByText('Thành tích đã được lưu.')).toBeVisible();
    await expect(page.locator('.leaderboard').getByText(nick, { exact: true })).toBeVisible();
    expect(
      (await pool.query('SELECT moves FROM game_results WHERE session_id=$1', [session.id])).rows[0]
        .moves,
    ).toBe(6);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Bạn đã tìm đủ các cặp!' })).toBeVisible();
    await expect(page.locator('.leaderboard').getByText(nick, { exact: true })).toBeVisible();
    await page.getByLabel('Độ khó').selectOption('hard');
    await page.getByRole('button', { name: 'Ván mới' }).click();
    await expect(page.getByRole('button', { name: /^Thẻ / })).toHaveCount(24);
    const newSession = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('memory-session')!),
    );
    expect(newSession.id).not.toBe(session.id);
    await pool.query('DELETE FROM game_sessions WHERE id=$1', [newSession.id]);
  } finally {
    await pool.query('DELETE FROM game_results WHERE session_id=$1', [session.id]);
    await pool.query('DELETE FROM game_sessions WHERE id=$1', [session.id]);
  }
});
