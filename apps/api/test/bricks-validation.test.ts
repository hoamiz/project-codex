import { test, expect } from 'vitest';
import { brickLayoutSchema } from '../src/services/bricks.js';
import { layoutError, brickCatalog } from '../src/services/brick-geometry.js';
import { fixtureBrick as b, tower } from '../../web/src/features/brick-playground/brick-fixture';
test('server and frontend geometry accept supported catalog fixtures and reject invalid inputs', () => {
  for (const layout of [
    tower,
    { ...tower, bricks: [] },
    { ...tower, bricks: [b(1), b(2, { kind: 'brick-1x2', rotation: 90, y: 3 })] },
  ]) {
    expect(brickLayoutSchema.safeParse(layout).success).toBe(true);
    expect(layoutError(layout, brickCatalog)).toBeNull();
  }
  for (const layout of [
    { ...tower, bricks: [b(1), b(2)] },
    { ...tower, bricks: [b(1), b(1)] },
    { ...tower, bricks: [b(1, { y: 3 })] },
    { ...tower, bricks: [b(1, { x: 0.25 })] },
    { ...tower, bricks: [b(1, { x: 32 })] },
    { ...tower, bricks: [b(1, { color: 'url(x)' })] },
    { ...tower, bricks: [b(1, { kind: 'unknown' as never })] },
    { ...tower, bricks: [{ ...b(1), width: 1 }] },
    { ...tower, extra: true },
    { ...tower, bricks: [b(1, { rotation: 45 as never })] },
    { ...tower, bricks: [b(1, { x: NaN })] },
    {
      ...tower,
      bricks: Array.from({ length: 151 }, (_, i) => b(i + 1, { x: i % 32, z: Math.floor(i / 32) })),
    },
  ]) {
    expect(brickLayoutSchema.safeParse(layout).success).toBe(false);
    expect(layoutError(layout, brickCatalog)).not.toBeNull();
  }
});
test('normalization keeps safe title text and marks the invalid brick in Zod issues', () => {
  const parsed = brickLayoutSchema.parse({
    ...tower,
    title: ' <b>Nhà</b> ',
    bricks: [b(1, { color: '#EF4444' })],
  });
  expect(parsed.title).toBe('<b>Nhà</b>');
  expect(parsed.bricks[0].color).toBe('#ef4444');
  const result = brickLayoutSchema.safeParse({
    ...tower,
    bricks: [b(1), b(2, { x: 30, z: 0, kind: 'brick-2x4', rotation: 90 })],
  });
  expect(result.success).toBe(false);
  if (!result.success)
    expect(
      result.error.issues.some((issue) => issue.path[0] === 'bricks' && issue.path[1] === 1),
    ).toBe(true);
});
