import { randomInt } from 'node:crypto';
import { HttpError } from '../errors.js';
export type Difficulty = 'easy' | 'medium' | 'hard';
export interface GameState {
  difficulty: Difficulty;
  deck: { id: string; face: number }[];
  matched: string[];
  pending: string | null;
  mismatch: string[];
  cooldownUntil: number;
  moves: number;
  startedAt: number;
  finishedAt: number | null;
  version: number;
}
export const pairs = { easy: 6, medium: 8, hard: 12 };
/** Fisher–Yates với nguồn random có thể inject: production dùng crypto, test không cần tiết lộ deck qua API. */
export function createGame(
  difficulty: Difficulty,
  now = Date.now(),
  random: () => number = () => randomInt(0, 1000000) / 1000000,
): GameState {
  const faces = Array.from({ length: pairs[difficulty] }, (_, i) => i).flatMap((i) => [i, i]);
  for (let i = faces.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [faces[i], faces[j]] = [faces[j], faces[i]];
  }
  return {
    difficulty,
    deck: faces.map((face, i) => ({ id: `c${i}`, face })),
    matched: [],
    pending: null,
    mismatch: [],
    cooldownUntil: 0,
    moves: 0,
    startedAt: now,
    finishedAt: null,
    version: 1,
  };
}
/** Mỗi cặp lật hợp lệ tăng một lượt; cặp sai giữ mở 800ms và không nhận thẻ thứ ba trong khoảng đó. */
export function flip(
  state: GameState,
  cardId: string,
  version: number,
  now = Date.now(),
): GameState {
  if (version !== state.version)
    throw new HttpError(409, 'STALE_VERSION', 'Bàn chơi đã thay đổi. Hãy đồng bộ phiên.');
  if (state.finishedAt !== null) throw new HttpError(409, 'FINISHED', 'Ván chơi đã hoàn thành.');
  if (now < state.cooldownUntil)
    throw new HttpError(409, 'COOLDOWN', 'Đợi cặp thẻ đang mở đóng lại.');
  const next = structuredClone(state);
  if (now >= next.cooldownUntil) {
    next.mismatch = [];
    next.cooldownUntil = 0;
  }
  const card = next.deck.find((c) => c.id === cardId);
  if (!card) throw new HttpError(400, 'INVALID_CARD', 'Thẻ không hợp lệ.');
  if (next.matched.includes(cardId) || next.pending === cardId)
    throw new HttpError(409, 'ALREADY_OPEN', 'Thẻ này đã mở.');
  if (!next.pending) next.pending = cardId;
  else {
    const first = next.deck.find((c) => c.id === next.pending)!;
    next.moves++;
    if (first.face === card.face) next.matched.push(first.id, card.id);
    else {
      next.mismatch = [first.id, card.id];
      next.cooldownUntil = now + 800;
    }
    next.pending = null;
    if (next.matched.length === next.deck.length) next.finishedAt = now;
  }
  next.version++;
  return next;
}
/** Không trả mặt thẻ kín; thời gian kết thúc do backend quyết định, client chỉ dùng giá trị này cho UX. */
export function publicGame(state: GameState, now = Date.now()) {
  const visible = new Set([
    ...state.matched,
    ...(state.pending ? [state.pending] : []),
    ...(now < state.cooldownUntil ? state.mismatch : []),
  ]);
  return {
    difficulty: state.difficulty,
    cards: state.deck.map((c) => ({
      id: c.id,
      matched: state.matched.includes(c.id),
      ...(visible.has(c.id) ? { face: c.face } : {}),
    })),
    moves: state.moves,
    matchedPairs: state.matched.length / 2,
    totalPairs: pairs[state.difficulty],
    status: state.finishedAt === null ? 'playing' : 'finished',
    elapsedMs: Math.max(0, (state.finishedAt ?? now) - state.startedAt),
    version: state.version,
    cooldownMs: Math.max(0, state.cooldownUntil - now),
  };
}
