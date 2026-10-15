import { test, expect, vi } from 'vitest';
import { createRewardBook, readStickers, rewardsKey } from './rewards-core';
test('L25 one reward per round, replay cannot award twice, bounded complete collection survives reload', () => {
  let raw: string | null = null;
  const store = {
    getItem: () => raw,
    setItem: vi.fn((key: string, value: string) => {
      expect(key).toBe(rewardsKey);
      raw = value;
    }),
  };
  const book = createRewardBook(store);
  expect(book.award('r1').newId).toBe('bee');
  expect(book.award('r1').newId).toBeNull();
  expect(store.setItem).toHaveBeenCalledOnce();
  for (let i = 2; i <= 20; i++) book.award('r' + i);
  expect(book.view()).toHaveLength(12);
  expect(store.setItem).toHaveBeenCalledTimes(12);
  expect(createRewardBook(store).view()).toEqual(book.view());
});
test('L25 malformed/unknown-version/storage-blocked and quota failure fall back without stopping play', () => {
  expect(readStickers('{broken')).toEqual([]);
  expect(readStickers('{"version":2,"ids":["bee"]}')).toEqual([]);
  expect(readStickers('{"version":1,"ids":["bee","bee","evil",2]}')).toEqual(['bee']);
  const book = createRewardBook({
    getItem: () => {
      throw Error('blocked');
    },
    setItem: () => {
      throw Error('full');
    },
  });
  expect(book.award('r1')).toEqual({ ids: ['bee'], newId: 'bee', saved: false });
  expect(book.view()).toEqual(['bee']);
  expect(createRewardBook(null).award('r2').saved).toBe(false);
});
