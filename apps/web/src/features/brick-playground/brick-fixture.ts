import { brickCatalog, type Brick, type BrickLayout } from './brick-core';
export { brickCatalog as catalog };
export function fixtureBrick(n: number, patch: Partial<Brick> = {}): Brick {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    kind: 'brick-1x1',
    color: '#ef4444',
    x: 0,
    y: 0,
    z: 0,
    rotation: 0,
    ...patch,
  };
}
export const tower: BrickLayout = {
  schemaVersion: 1,
  title: 'Tháp ba tầng',
  bricks: [fixtureBrick(1), fixtureBrick(2, { y: 3 }), fixtureBrick(3, { y: 6 })],
};
