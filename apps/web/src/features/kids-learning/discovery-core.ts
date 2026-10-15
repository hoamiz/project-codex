import type { NumberRange } from './lessons';
import { validRange } from './range-core';
import {
  seekThemes,
  type SeekObjectId,
  type SeekTheme,
  type SeekThemeId,
} from './discovery-lessons';

/** Fisher–Yates trên bản sao; RNG inject giúp kiểm đủ đề mà không sửa trạng thái bài trên browser. */
function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export interface NumberCard {
  id: string;
  value: number;
  dx: number;
  dy: number;
  tilt: number;
}
export interface NumberSearchRound {
  id: string;
  range: NumberRange;
  cards: NumberCard[];
}
export interface NumberSearchState {
  round: NumberSearchRound;
  target: number;
  found: string[];
  phase: 'playing' | 'celebrating' | 'completed';
}
/** Ba bản sao mỗi số, xáo vị trí và lệch nhẹ trong ô để vẫn giữ vùng chạm lớn, không chồng nhau. */
export function createNumberSearch(range: NumberRange, random = Math.random): NumberSearchState {
  if (!validRange(range)) throw new Error('Khoảng số không hợp lệ');
  const id = crypto.randomUUID();
  const cards = Array.from({ length: range.end - range.start + 1 }, (_, i) =>
    Array.from({ length: 3 }, (_, copy) => ({
      id: `${id}:${i}:${copy}`,
      value: range.start + i,
      dx: random() * 6 - 3,
      dy: random() * 6 - 3,
      tilt: random() * 12 - 6,
    })),
  ).flat();
  return {
    round: { id, range: { ...range }, cards: shuffled(cards, random) },
    target: range.start,
    found: [],
    phase: 'playing',
  };
}
/** Chỉ số đang được yêu cầu mới tính; nhấp lặp/future/ID lạ không tăng tiến độ hoặc đổi màu. */
export function findNumber(state: NumberSearchState, id: string): NumberSearchState {
  const card = state.round.cards.find((item) => item.id === id);
  if (state.phase !== 'playing' || !card || card.value !== state.target || state.found.includes(id))
    return state;
  const found = [...state.found, id];
  const all = state.round.cards
    .filter((item) => item.value === state.target)
    .every((item) => found.includes(item.id));
  return {
    ...state,
    found,
    phase: all ? (state.target === state.round.range.end ? 'completed' : 'celebrating') : 'playing',
  };
}
/** Callback chậm của đề cũ không được sáng số tiếp theo trong đề mới. */
export function nextNumber(state: NumberSearchState, roundId: string): NumberSearchState {
  return state.phase === 'celebrating' && state.round.id === roundId
    ? { ...state, target: state.target + 1, phase: 'playing' }
    : state;
}
export interface SeekPlacement {
  id: SeekObjectId;
  x: number;
  y: number;
  tilt: number;
}
export interface SeekState {
  id: string;
  theme: SeekTheme;
  placements: SeekPlacement[];
  selected: SeekObjectId;
  found: SeekObjectId[];
}
const themeSlots: Record<SeekThemeId, { x: number; y: number }[]> = {
  ocean: [
    { x: 18, y: 25 },
    { x: 74, y: 20 },
    { x: 46, y: 47 },
    { x: 80, y: 77 },
    { x: 22, y: 79 },
  ],
  desert: [
    { x: 16, y: 52 },
    { x: 77, y: 48 },
    { x: 47, y: 66 },
    { x: 80, y: 83 },
    { x: 19, y: 85 },
  ],
  jungle: [
    { x: 16, y: 42 },
    { x: 80, y: 40 },
    { x: 48, y: 60 },
    { x: 82, y: 82 },
    { x: 19, y: 83 },
  ],
  dinosaurs: [
    { x: 16, y: 48 },
    { x: 79, y: 46 },
    { x: 47, y: 65 },
    { x: 81, y: 84 },
    { x: 19, y: 85 },
  ],
  transport: [
    { x: 16, y: 62 },
    { x: 50, y: 62 },
    { x: 84, y: 62 },
    { x: 32, y: 85 },
    { x: 68, y: 85 },
  ],
};
/** Cảnh chỉ chứa đúng hình của chủ đề; vị trí đổi trong các ô tách nhau, màn random tránh lặp chủ đề trước. */
export function createSeek(
  theme: SeekThemeId | 'random' = 'random',
  random = Math.random,
  previous?: SeekState,
): SeekState {
  let index =
    theme === 'random'
      ? Math.min(seekThemes.length - 1, Math.floor(random() * seekThemes.length))
      : seekThemes.findIndex((item) => item.id === theme);
  if (index < 0) throw new Error('Chủ đề không hợp lệ');
  if (theme === 'random' && seekThemes[index].id === previous?.theme.id)
    index = (index + 1) % seekThemes.length;
  const selected = seekThemes[index];
  const locations = shuffled(themeSlots[selected.id], random);
  const placements = selected.objects.map((id, i) => ({
    id,
    x: locations[i].x + random() * 6 - 3,
    y: locations[i].y + random() * 6 - 3,
    tilt: random() * 12 - 6,
  }));
  return {
    id: crypto.randomUUID(),
    theme: selected,
    placements,
    selected: placements[0].id,
    found: [],
  };
}
export function selectSeek(state: SeekState, id: SeekObjectId): SeekState {
  return state.placements.some((item) => item.id === id) && !state.found.includes(id)
    ? { ...state, selected: id }
    : state;
}
/** Tìm đúng hình đã chọn mới mở khóa; sau mỗi lần đúng chọn hình chưa tìm tiếp theo, không tính lặp. */
export function findSeek(state: SeekState, id: SeekObjectId): SeekState {
  if (
    id !== state.selected ||
    state.found.includes(id) ||
    !state.placements.some((item) => item.id === id)
  )
    return state;
  const found = [...state.found, id];
  return {
    ...state,
    found,
    selected: state.placements.find((item) => !found.includes(item.id))?.id || id,
  };
}
