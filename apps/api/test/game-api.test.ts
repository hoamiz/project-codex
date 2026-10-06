import { test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db.js';
import { migrate } from '../src/services/migrations.js';
import type { GameState } from '../src/services/game.js';
const ids: string[] = [];
beforeAll(() => migrate(pool));
afterAll(async () => {
  await pool.query('DELETE FROM game_results WHERE session_id=ANY($1::uuid[])', [ids]);
  await pool.query('DELETE FROM game_sessions WHERE id=ANY($1::uuid[])', [ids]);
  await pool.end();
});
const start = async () => {
  const r = await request(app).post('/api/games/memory/sessions').send({ difficulty: 'easy' });
  expect(r.status).toBe(201);
  ids.push(r.body.data.id);
  return r.body.data as {
    id: string;
    token: string;
    version: number;
    cards: { id: string; face?: number }[];
  };
};
test('hidden deck, token authorization, expiration, version lock and concurrency', async () => {
  const game = await start();
  expect(game.cards.every((c) => c.face === undefined)).toBe(true);
  expect(
    (await request(app).get(`/api/games/memory/sessions/${game.id}`).set('X-Game-Token', 'wrong'))
      .status,
  ).toBe(403);
  const flip = (card: string) =>
    request(app)
      .post(`/api/games/memory/sessions/${game.id}/flips`)
      .set('X-Game-Token', game.token)
      .send({ cardId: card, version: 1 });
  const results = await Promise.all([flip('c0'), flip('c1')]);
  expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  await pool.query("UPDATE game_sessions SET expires_at=now()-interval '1 second' WHERE id=$1", [
    game.id,
  ]);
  expect(
    (
      await request(app)
        .get(`/api/games/memory/sessions/${game.id}`)
        .set('X-Game-Token', game.token)
    ).status,
  ).toBe(410);
});
test('complete game via API; reject forged result; persist exactly one ranked score', async () => {
  const game = await start();
  const submit = (body: object) =>
    request(app)
      .post(`/api/games/memory/sessions/${game.id}/results`)
      .set('X-Game-Token', game.token)
      .send(body);
  expect((await submit({ nickname: 'Fixture' })).status).toBe(409);
  expect((await submit({ nickname: 'Fixture', moves: 1, elapsedMs: 0 })).status).toBe(400);
  // Test dùng DB riêng để biết fixture; production không có endpoint tiết lộ deck.
  const state = (await pool.query('SELECT state FROM game_sessions WHERE id=$1', [game.id])).rows[0]
    .state as GameState;
  const groups = new Map<number, string[]>();
  for (const c of state.deck) groups.set(c.face, [...(groups.get(c.face) || []), c.id]);
  let version = game.version;
  for (const cards of groups.values())
    for (const cardId of cards) {
      const r = await request(app)
        .post(`/api/games/memory/sessions/${game.id}/flips`)
        .set('X-Game-Token', game.token)
        .send({ cardId, version });
      expect(r.status).toBe(200);
      version = r.body.data.version;
    }
  const first = await submit({ nickname: '<Fixture>' });
  expect(first.status).toBe(200);
  expect(first.body.data.moves).toBe(6);
  expect(first.body.data.elapsedMs).toBeGreaterThan(0);
  expect((await submit({ nickname: '<Fixture>' })).body.data.id).toBe(first.body.data.id);
  expect(
    (await pool.query('SELECT count(*) FROM game_results WHERE session_id=$1', [game.id])).rows[0]
      .count,
  ).toBe('1');
  const rank = await request(app)
    .get('/api/games/memory/leaderboard')
    .query({ difficulty: 'easy' });
  expect(rank.body.data.some((r: { id: string }) => r.id === first.body.data.id)).toBe(true);
  expect(
    (
      await request(app).get('/api/games/memory/leaderboard').query({ difficulty: 'hard' })
    ).body.data.some((r: { id: string }) => r.id === first.body.data.id),
  ).toBe(false);
});
test('leaderboard prioritizes moves, then elapsed time, then creation time', async () => {
  const scores = [
    { moves: 7, time: 1000, nick: 'Ranking A' },
    { moves: 6, time: 2000, nick: 'Ranking B' },
    { moves: 6, time: 1000, nick: 'Ranking C' },
    { moves: 6, time: 1000, nick: 'Ranking D' },
  ];
  for (const [index, score] of scores.entries()) {
    const game = await start();
    const state = (await pool.query('SELECT state FROM game_sessions WHERE id=$1', [game.id]))
      .rows[0].state as GameState;
    state.matched = state.deck.map((c) => c.id);
    state.moves = score.moves;
    state.finishedAt = state.startedAt + score.time;
    await pool.query('UPDATE game_sessions SET state=$1 WHERE id=$2', [
      JSON.stringify(state),
      game.id,
    ]);
    await request(app)
      .post(`/api/games/memory/sessions/${game.id}/results`)
      .set('X-Game-Token', game.token)
      .send({ nickname: score.nick });
    await pool.query(
      "UPDATE game_results SET created_at='2026-01-01'::timestamptz+$1*interval '1 second' WHERE session_id=$2",
      [index, game.id],
    );
  }
  const result = await request(app)
    .get('/api/games/memory/leaderboard')
    .query({ difficulty: 'easy', pageSize: 100 });
  expect(
    result.body.data
      .filter((r: { nickname: string }) => r.nickname.startsWith('Ranking '))
      .map((r: { nickname: string }) => r.nickname),
  ).toEqual(['Ranking C', 'Ranking D', 'Ranking B', 'Ranking A']);
  const firstId = ids[ids.length - 1];
  await expect(
    pool.query(
      "INSERT INTO game_results(session_id,nickname,difficulty,moves,elapsed_ms) SELECT session_id,'duplicate',difficulty,moves,elapsed_ms FROM game_results WHERE session_id=$1",
      [firstId],
    ),
  ).rejects.toThrow();
});
