export type Level = 'easy' | 'medium';
export type Pattern = 'straight' | 'zigzag' | 'wave';
export interface Point {
  x: number;
  y: number;
}
export interface NumberRange {
  start: number;
  end: number;
}
export const levels = {
  easy: { label: 'Dễ', tolerance: 18, stroke: 6 },
  medium: { label: 'Vừa', tolerance: 12, stroke: 4 },
} as const;
export const patterns: Pattern[] = ['straight', 'zigzag', 'wave'];
export const companions = [
  {
    id: 'bee',
    name: 'Ong',
    target: 'hoa',
    action: 'Ong hút mật',
    instruction: 'Giúp bạn ong đến bông hoa nhé.',
    destination: 'flower',
  },
  {
    id: 'dog',
    name: 'Chó',
    target: 'xương',
    action: 'Chó gặm xương',
    instruction: 'Giúp bạn chó tìm khúc xương nhé.',
    destination: 'bone',
  },
  {
    id: 'cow',
    name: 'Bò',
    target: 'cỏ',
    action: 'Bò ăn cỏ',
    instruction: 'Giúp bạn bò đến bãi cỏ nhé.',
    destination: 'grass',
  },
  {
    id: 'child',
    name: 'Bạn nhỏ',
    target: 'nhà',
    action: 'Bạn nhỏ vào nhà',
    instruction: 'Cùng đưa bạn nhỏ về nhà nhé.',
    destination: 'house',
  },
] as const;
export type Companion = (typeof companions)[number];
export const countShapes = ['star', 'apple', 'fish'] as const;
export const stickerIds = [
  'bee',
  'dog',
  'cow',
  'cat',
  'rabbit',
  'bear',
  'fox',
  'panda',
  'frog',
  'penguin',
  'owl',
  'whale',
] as const;
export const defaultRange: NumberRange = { start: 1, end: 5 };
export const basePath = '/projects/kids-learning';
