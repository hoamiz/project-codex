import { countShapes, type NumberRange } from './lessons';
import { validRange } from './range-core';
export interface MatchRound {
  id: string;
  numbers: number[];
  targets: number[];
  shape: (typeof countShapes)[number];
}
export interface Connection {
  source: number;
  target: number;
  correct: boolean;
}
/** Cặp đúng khóa cả hai đầu; đường giao nhau không ảnh hưởng đáp án và đích sai không bị khóa. */
export function checkConnection(
  round: MatchRound,
  connections: Connection[],
  source: number,
  target: number,
): Connection | null {
  if (
    !round.numbers.includes(source) ||
    !round.targets.includes(target) ||
    connections.some((c) => c.correct && (c.source === source || c.target === target))
  )
    return null;
  return { source, target, correct: source === target };
}
/** Fisher–Yates trên bản sao: RNG chỉ dùng lúc tạo đề, không lệ thuộc render và không mất cặp. */
export function createMatching(range: NumberRange, random: () => number = Math.random): MatchRound {
  if (!validRange(range)) throw new Error('Khoảng số không hợp lệ');
  const numbers = Array.from({ length: range.end - range.start + 1 }, (_, i) => range.start + i);
  const targets = [...numbers];
  for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [targets[i], targets[j]] = [targets[j], targets[i]];
  }
  if (targets.every((n, i) => n === numbers[i]))
    [targets[0], targets[1]] = [targets[1], targets[0]];
  const shape = countShapes[Math.min(2, Math.max(0, Math.floor(random() * 3)))];
  return { id: crypto.randomUUID(), numbers, targets, shape };
}
