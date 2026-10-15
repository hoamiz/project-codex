import {
  companions,
  patterns,
  levels,
  type Companion,
  type Level,
  type Pattern,
  type Point,
} from './lessons';
import { distance, pathLength, resample } from './drawing-core';
export interface TraceRound {
  id: string;
  companion: Companion;
  pattern: Pattern;
  variant: number;
  level: Level;
}
/** Một lần tạo đề mới dùng RNG; tránh lặp toàn bộ cặp/mẫu, nhưng retry/resize dùng lại object cũ. */
export function createTrace(
  level: Level,
  random: () => number = Math.random,
  previous?: TraceRound,
): TraceRound {
  const companion =
    companions[Math.min(companions.length - 1, Math.floor(random() * companions.length))];
  let pattern = patterns[Math.min(2, Math.floor(random() * 3))];
  const variant = Math.min(1, Math.floor(random() * 2));
  if (
    previous &&
    previous.companion.id === companion.id &&
    previous.pattern === pattern &&
    previous.variant === variant
  )
    pattern = patterns[(patterns.indexOf(pattern) + 1) % 3];
  return { id: crypto.randomUUID(), companion, pattern, variant, level };
}
/** SVG có cùng đơn vị CSS px; độ cao mẫu luôn đủ tách đường tắt khỏi hành lang Dễ ở mobile. */
export function tracePoints(round: TraceRound, width: number, height = 240): Point[] {
  const knots = [
    0.5,
    ...Array.from({ length: round.variant ? 3 : 2 }, (_, i) => (i % 2 ? 0.78 : 0.22)),
    0.5,
  ];
  return Array.from({ length: 241 }, (_, i) => {
    const t = i / 240;
    let y = 0.5;
    if (round.pattern === 'wave') y += 0.28 * Math.sin(t * Math.PI * 2 * (round.variant + 1));
    if (round.pattern === 'zigzag') {
      const segment = Math.min(knots.length - 2, Math.floor(t * (knots.length - 1)));
      const u = t * (knots.length - 1) - segment;
      y = knots[segment] * (1 - u) + knots[segment + 1] * u;
    }
    return { x: 32 + (width - 64) * t, y: height * y };
  });
}
export interface TraceGrade {
  accepted: boolean;
  coverage: number;
  inside: number;
  reason: string;
}
/** Chấm nét thật theo chiều dài hai chiều và thứ tự tiến: hai điểm đúng không đủ cho đường cong. */
export function gradeTrace(raw: Point[], guide: Point[], level: Level): TraceGrade {
  const fail = (reason: string): TraceGrade => ({
    accepted: false,
    coverage: 0,
    inside: 0,
    reason,
  });
  if (
    raw.length < 2 ||
    raw.length > 4096 ||
    raw.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))
  )
    return fail('Bắt đầu từ chấm và giữ bút theo đường nhé.');
  const tolerance = levels[level].tolerance;
  const samples = resample(raw);
  const target = resample(guide);
  if (
    target.length < 2 ||
    distance(raw[0], guide[0]) > 22 ||
    distance(raw.at(-1)!, guide.at(-1)!) > 22
  )
    return fail('Đi từ chấm bắt đầu đến chấm cuối nhé.');
  const length = pathLength(samples),
    expected = pathLength(target);
  if (length < 10 || length / expected < 0.8 || length / expected > 2)
    return fail('Cùng đi theo nét chấm, không vẽ vòng thêm nhé.');
  let inside = 0,
    previous = 0,
    backtracking = 0;
  const covered = new Set<number>();
  for (const p of samples) {
    let nearest = 0,
      min = Infinity;
    for (let i = 0; i < target.length; i++) {
      const d = distance(p, target[i]);
      if (d <= tolerance) covered.add(i);
      if (d < min) {
        min = d;
        nearest = i;
      }
    }
    if (min <= tolerance) inside++;
    backtracking += Math.max(0, previous - nearest) * 4;
    previous = nearest;
  }
  const coverage = covered.size / target.length;
  const ratio = inside / samples.length;
  const accepted = coverage >= 0.9 && ratio >= 0.9 && backtracking <= expected * 0.25;
  return {
    accepted,
    coverage,
    inside: ratio,
    reason: accepted ? 'Con đồ nét giỏi quá!' : 'Con thử đi sát nét chấm thêm một lần nhé.',
  };
}
