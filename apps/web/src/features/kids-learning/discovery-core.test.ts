import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createNumberSearch,
  findNumber,
  nextNumber,
  createSeek,
  selectSeek,
  findSeek,
} from './discovery-core';
import { seekThemes, seekObjects, numberColors } from './discovery-lessons';
import { learningImage } from './learning-assets';

test('K01/K02 all 45 ranges contain exactly three copies per value, unique IDs and safe jitter', () => {
  for (let start = 1; start < 10; start++)
    for (let end = start + 1; end <= 10; end++)
      for (const rng of [() => 0, () => 0.99]) {
        const state = createNumberSearch({ start, end }, rng);
        expect(state.round.cards).toHaveLength((end - start + 1) * 3);
        expect(new Set(state.round.cards.map((c) => c.id)).size).toBe(state.round.cards.length);
        expect(state.target).toBe(start);
        for (let value = start; value <= end; value++)
          expect(state.round.cards.filter((c) => c.value === value)).toHaveLength(3);
        expect(
          state.round.cards.every(
            (c) => Math.abs(c.dx) <= 3 && Math.abs(c.dy) <= 3 && Math.abs(c.tilt) <= 6,
          ),
        ).toBe(true);
      }
  expect(new Set(Object.values(numberColors)).size).toBe(10);
  expect(() => createNumberSearch({ start: 5, end: 5 })).toThrow();
  expect(() => createNumberSearch({ start: 0, end: 10 })).toThrow();
});
test('K02 future/duplicate clicks never count and only all copies advance in ascending order', () => {
  let state = createNumberSearch({ start: 2, end: 4 }, () => 0.5);
  const future = state.round.cards.find((c) => c.value === 3)!;
  expect(findNumber(state, future.id)).toBe(state);
  expect(findNumber(state, 'unknown')).toBe(state);
  for (let value = 2; value <= 4; value++) {
    const copies = state.round.cards.filter((c) => c.value === value);
    for (const card of copies) {
      state = findNumber(state, card.id);
      expect(findNumber(state, card.id)).toBe(state);
    }
    expect(state.phase).toBe(value === 4 ? 'completed' : 'celebrating');
    if (value < 4) {
      expect(nextNumber(state, 'old-round')).toBe(state);
      state = nextNumber(state, state.round.id);
      expect(state.target).toBe(value + 1);
    }
  }
  expect(state.found).toHaveLength(9);
  expect(nextNumber(state, state.round.id)).toBe(state);
});
test('K01/K05 every theme draws eight of its own objects into distinct bounded places', () => {
  for (const theme of seekThemes)
    for (const rng of [() => 0, () => 0.99]) {
      const state = createSeek(theme.id, rng);
      const ids = state.placements.map((p) => p.id);
      expect(state.theme.id).toBe(theme.id);
      expect(theme.objects.length).toBeGreaterThanOrEqual(8);
      expect(ids).toHaveLength(8);
      expect(new Set(ids).size).toBe(ids.length);
      expect(theme.objects).toEqual(expect.arrayContaining(ids));
      expect(
        state.placements.every(
          (p) =>
            seekObjects.some((o) => o.id === p.id) && p.x > 10 && p.x < 90 && p.y > 10 && p.y < 90,
        ),
      ).toBe(true);
      for (const a of state.placements)
        for (const b of state.placements)
          if (a !== b) expect(Math.hypot((a.x - b.x) * 3, (a.y - b.y) * 3)).toBeGreaterThan(65);
    }
  const oceanA = createSeek('ocean', () => 0).placements.map((p) => p.id);
  const oceanB = createSeek('ocean', () => 0.99).placements.map((p) => p.id);
  expect(oceanA).not.toEqual(oceanB);
  const before = createSeek('random', () => 0);
  const after = createSeek('random', () => 0, before);
  expect(after.theme.id).not.toBe(before.theme.id);
  expect(after.id).not.toBe(before.id);
});
test('K05 only selected hidden target counts, found locks, and all eight can finish in chosen order', () => {
  let state = createSeek('ocean', () => 0.5);
  const other = state.placements[2].id;
  expect(findSeek(state, other)).toBe(state);
  state = selectSeek(state, other);
  state = findSeek(state, other);
  expect(state.found).toEqual([other]);
  expect(findSeek(state, other)).toBe(state);
  expect(selectSeek(state, other)).toBe(state);
  while (state.found.length < 8) state = findSeek(state, state.selected);
  expect(new Set(state.found).size).toBe(8);
  expect(findSeek(state, state.selected)).toBe(state);
});

test('K01/K04 every target and every scene have a local illustration', () => {
  for (const asset of [
    ...seekObjects.map((item) => item.asset),
    ...seekThemes.map((theme) => `scene-${theme.id}`),
  ]) {
    const file = learningImage(asset).replace(/^\//, '');
    const bytes = readFileSync(resolve('public', file));
    if (file.endsWith('.png')) expect(bytes.subarray(0, 4).toString('hex')).toBe('89504e47');
    else {
      const svg = bytes.toString('utf8');
      expect(svg).toContain('<svg');
      expect(svg).toContain('<title>');
      expect(svg).not.toContain('<image');
    }
  }
});
