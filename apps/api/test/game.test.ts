import { test, expect } from 'vitest';
import { createGame, flip, publicGame, type Difficulty } from '../src/services/game.js';
for (const [difficulty, count] of [
  ['easy', 6],
  ['medium', 8],
  ['hard', 12],
] as const)
  test(`${difficulty} has exactly two cards for each of ${count} faces`, () => {
    const g = createGame(difficulty as Difficulty, 1000, () => 0.42);
    expect(g.deck).toHaveLength(count * 2);
    for (let i = 0; i < count; i++) expect(g.deck.filter((c) => c.face === i)).toHaveLength(2);
    expect(publicGame(g, 1000).cards.every((c) => c.face === undefined)).toBe(true);
  });
test('matching, duplicate/stale rejection and final score use server clock', () => {
  let g = createGame('easy', 1000, () => 0.5);
  const groups = new Map<number, string[]>();
  for (const c of g.deck) groups.set(c.face, [...(groups.get(c.face) || []), c.id]);
  let now = 1100;
  for (const ids of groups.values()) {
    g = flip(g, ids[0], g.version, now);
    expect(() => flip(g, ids[0], g.version, now)).toThrow();
    expect(() => flip(g, ids[1], g.version - 1, now)).toThrow();
    g = flip(g, ids[1], g.version, now + 50);
    expect(() => flip(g, ids[0], g.version, now)).toThrow();
    now += 100;
  }
  expect(g.moves).toBe(6);
  expect(publicGame(g, 999999).elapsedMs).toBe(650);
  expect(publicGame(g).status).toBe('finished');
});
test('mismatch counts once and locks third card until hide timeout', () => {
  let g = createGame('easy', 1000, () => 0.5);
  const a = g.deck[0],
    b = g.deck.find((c) => c.face !== a.face)!,
    c = g.deck.find((c) => c.id !== a.id && c.id !== b.id)!;
  g = flip(g, a.id, g.version, 1100);
  g = flip(g, b.id, g.version, 1200);
  expect(g.moves).toBe(1);
  expect(publicGame(g, 1300).cards.filter((c) => c.face !== undefined)).toHaveLength(2);
  expect(() => flip(g, c.id, g.version, 1300)).toThrow();
  expect(publicGame(g, 2001).cards.every((c) => c.face === undefined)).toBe(true);
  g = flip(g, c.id, g.version, 2001);
  expect(g.moves).toBe(1);
  expect(() => flip(g, 'invalid', g.version, 2100)).toThrow();
});
