import { test, expect } from 'vitest';
import { catalog, fixtureBrick as b, tower } from './brick-fixture';
import {
  dimensions,
  layoutError,
  placementError,
  freePosition,
  atPosition,
  settle,
  emptyBricks,
  commitHistory,
  historyOf,
  undo,
  redo,
  parseDraft,
} from './brick-core';

test('all catalog shapes use integer dimensions, rotations swap footprint and border contact is valid', () => {
  for (const spec of catalog.kinds)
    for (const rotation of [0, 90, 180, 270] as const) {
      const brick = b(1, { kind: spec.kind, rotation });
      expect(dimensions(brick, catalog)).toEqual({
        width: rotation % 180 ? spec.depth : spec.width,
        depth: rotation % 180 ? spec.width : spec.depth,
        height: spec.height,
      });
      expect(placementError(brick, [brick, b(2, { x: 10 })], catalog)).toBeNull();
    }
  expect(layoutError({ ...tower, bricks: [b(1), b(2, { x: 1 })] }, catalog)).toBeNull();
});
test('collision, unsupported, off-grid, nonfinite, out-of-bounds and excess height are rejected', () => {
  for (const patch of [
    { x: -1 },
    { x: 32 },
    { z: 32 },
    { y: 48 },
    { x: 0.2 },
    { x: NaN },
    { z: Infinity },
    { y: 1 },
  ])
    expect(placementError(b(1, patch), [], catalog)).not.toBeNull();
  expect(placementError(b(1), [b(2)], catalog)).toContain('trùng');
  expect(layoutError(tower, catalog)).toBeNull();
  const tall = { ...tower, bricks: Array.from({ length: 16 }, (_, i) => b(i + 1, { y: i * 3 })) };
  expect(layoutError(tall, catalog)).toBeNull();
  expect(
    layoutError({ ...tall, bricks: [...tall.bricks, b(17, { y: 48 })] }, catalog),
  ).not.toBeNull();
});
test('overhang needs at least one support; preview selects the top and ignores the moved brick', () => {
  const bridge = b(3, { kind: 'brick-1x2', rotation: 90, y: 3 });
  expect(placementError(bridge, [b(1), bridge], catalog)).toBeNull();
  expect(placementError(bridge, [b(2, { x: 2 }), bridge], catalog)).toContain('điểm tựa');
  expect(atPosition(b(4), 0, 0, tower.bricks, catalog).y).toBe(9);
  expect(atPosition(tower.bricks[2], 0, 0, tower.bricks, catalog).y).toBe(6);
});
test('spawn scans rows without mutations and rejects full base or max count', () => {
  const rest = [b(1)];
  const copy = structuredClone(rest);
  expect(freePosition(b(2), rest, catalog)).toMatchObject({ x: 1, y: 0, z: 0 });
  expect(rest).toEqual(copy);
  const small = { ...catalog, baseplate: { ...catalog.baseplate, width: 2, depth: 2 } };
  expect(freePosition(b(2), [b(1, { kind: 'brick-2x2' })], small)).toBeNull();
  expect(
    freePosition(
      b(151),
      Array.from({ length: 150 }, (_, i) => b(i + 1, { x: i % 32, z: Math.floor(i / 32) })),
      catalog,
    ),
  ).toBeNull();
});
test('settle drops towers atomically, retains bridges with remaining supports and is order independent', () => {
  const input = tower.bricks.slice(1);
  const before = structuredClone(input);
  expect(settle(input, catalog).map((x) => x.y)).toEqual([0, 3]);
  expect(input).toEqual(before);
  const bridge = b(3, { kind: 'brick-1x2', rotation: 90, y: 3 });
  const supported = [b(2, { x: 1 }), bridge, b(4, { x: 1, y: 6 })];
  expect(settle(supported, catalog)).toEqual(supported);
  expect(
    settle([...supported].reverse(), catalog).sort((a, b) => a.id.localeCompare(b.id)),
  ).toEqual(settle(supported, catalog).sort((a, b) => a.id.localeCompare(b.id)));
  expect(layoutError({ ...tower, bricks: settle(input, catalog) }, catalog)).toBeNull();
});
test('draft validation is strict even when a later brick has an unknown kind', () => {
  for (const value of [
    null,
    { ...tower, schemaVersion: 2 },
    { ...tower, bricks: [b(1), b(2, { kind: 'unknown' as never })] },
    { ...tower, bricks: [b(1), b(1)] },
    { ...tower, bricks: [b(1, { color: 'javascript:red' })] },
    { ...tower, extra: 1 },
  ]) {
    expect(() => layoutError(value, catalog)).not.toThrow();
    expect(layoutError(value, catalog)).not.toBeNull();
    expect(parseDraft(JSON.stringify(value), catalog)).toBeNull();
  }
  expect(parseDraft('{bad', catalog)).toBeNull();
  expect(parseDraft(JSON.stringify(tower), catalog)).toEqual(tower);
});
test('history keeps 50 commands, ignores no-op, restores settle and discards redo after edits', () => {
  let history = historyOf(emptyBricks());
  expect(commitHistory(history, emptyBricks())).toBe(history);
  history = commitHistory(history, tower);
  const removed = { ...tower, bricks: settle(tower.bricks.slice(1), catalog) };
  history = commitHistory(history, removed);
  expect(undo(history).present).toEqual(tower);
  expect(redo(undo(history)).present).toEqual(removed);
  expect(commitHistory(undo(history), { ...tower, title: 'Nhánh mới' }).future).toEqual([]);
  for (let i = 0; i < 60; i++)
    history = commitHistory(history, { ...history.present, title: `Công trình ${i}` });
  expect(history.past).toHaveLength(50);
});
