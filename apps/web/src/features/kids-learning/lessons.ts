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
    movement: 'fly',
    arrival: 'eat',
  },
  {
    id: 'dog',
    name: 'Chó',
    target: 'xương',
    action: 'Chó gặm xương',
    instruction: 'Giúp bạn chó tìm khúc xương nhé.',
    destination: 'bone',
    movement: 'walk',
    arrival: 'eat',
  },
  {
    id: 'cow',
    name: 'Bò',
    target: 'cỏ',
    action: 'Bò ăn cỏ',
    instruction: 'Giúp bạn bò đến bãi cỏ nhé.',
    destination: 'grass',
    movement: 'walk',
    arrival: 'eat',
  },
  {
    id: 'child',
    name: 'Bạn nhỏ',
    target: 'nhà',
    action: 'Bạn nhỏ vào nhà',
    instruction: 'Cùng đưa bạn nhỏ về nhà nhé.',
    destination: 'house',
    movement: 'walk',
    arrival: 'enter',
  },
  {
    id: 'rabbit',
    name: 'Thỏ',
    target: 'cà rốt',
    action: 'Thỏ ăn cà rốt',
    instruction: 'Giúp bạn thỏ tìm củ cà rốt nhé.',
    destination: 'carrot',
    movement: 'walk',
    arrival: 'eat',
  },
  {
    id: 'cat',
    name: 'Mèo',
    target: 'cá',
    action: 'Mèo ăn cá',
    instruction: 'Giúp bạn mèo tìm chú cá nhé.',
    destination: 'fish',
    movement: 'walk',
    arrival: 'eat',
  },
  {
    id: 'duck',
    name: 'Vịt',
    target: 'ao nước',
    action: 'Vịt bơi trong ao',
    instruction: 'Giúp bạn vịt đến ao nước nhé.',
    destination: 'pond',
    movement: 'walk',
    arrival: 'swim',
  },
  {
    id: 'bird',
    name: 'Chim',
    target: 'tổ',
    action: 'Chim về tổ',
    instruction: 'Cùng đưa bạn chim về tổ nhé.',
    destination: 'nest',
    movement: 'fly',
    arrival: 'nest',
  },
  {
    id: 'car',
    name: 'Ô tô gia đình',
    target: 'nhà',
    action: 'Ô tô gia đình về đến nhà',
    instruction: 'Giúp xe ô tô gia đình về nhà nhé.',
    destination: 'house',
    movement: 'drive',
    arrival: 'park',
  },
  {
    id: 'school-child',
    name: 'Bạn nhỏ',
    target: 'trường học',
    action: 'Bạn nhỏ vào trường học',
    instruction: 'Cùng đưa bạn nhỏ đến trường học nhé.',
    destination: 'school',
    movement: 'walk',
    arrival: 'enter',
  },
  {
    id: 'cyclist',
    name: 'Bạn nhỏ đạp xe',
    target: 'công viên',
    action: 'Bạn nhỏ đỗ xe ở công viên',
    instruction: 'Cùng bạn nhỏ đạp xe đến công viên nhé.',
    destination: 'park',
    movement: 'cycle',
    arrival: 'park',
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
