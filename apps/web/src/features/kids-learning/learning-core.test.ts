import { describe, test, expect } from 'vitest';
import { companions, patterns, levels, stickerIds, defaultRange } from './lessons';
import { commitRange, validRange } from './range-core';
import { createMatching, checkConnection } from './matching-core';
import { clientPoint, resample, pathLength, connectionPath } from './drawing-core';
import { initialMatching, matchingReducer, initialTracing, tracingReducer } from './lesson-state';
import { createTrace, tracePoints, gradeTrace } from './tracing-core';
import type { Level } from './lessons';

describe('L01 lesson contract', () => {
  test('keeps four meaningful pairs, three paths and Easy default independent of range', () => {
    expect(companions.map((c) => [c.id, c.destination])).toEqual([
      ['bee', 'flower'],
      ['dog', 'bone'],
      ['cow', 'grass'],
      ['child', 'house'],
    ]);
    expect(patterns).toEqual(['straight', 'zigzag', 'wave']);
    expect(levels.easy.tolerance).toBeGreaterThan(levels.medium.tolerance);
    expect(defaultRange).toEqual({ start: 1, end: 5 });
    expect(new Set(stickerIds).size).toBe(12);
  });
});

describe('L13 trace state and obsolete callbacks', () => {
  test('only a continuous accepted attempt enters animation; replay preserves round and award history', () => {
    const round = createTrace('easy');
    const points = tracePoints(round, 300);
    let state = initialTracing(round);
    state = tracingReducer(state, { type: 'start' });
    state = tracingReducer(state, {
      type: 'submit',
      points: points.slice(0, 20),
      grade: gradeTrace(points.slice(0, 20), points, 'easy'),
    });
    expect(state.phase).toBe('retry');
    state = tracingReducer(state, { type: 'start' });
    expect(state.points).toEqual([]);
    state = tracingReducer(state, {
      type: 'submit',
      points,
      grade: gradeTrace(points, points, 'easy'),
    });
    expect(state.phase).toBe('animating');
    expect(
      tracingReducer(state, { type: 'animationDone', roundId: 'old', sequence: state.sequence }),
    ).toBe(state);
    expect(
      tracingReducer(state, {
        type: 'animationDone',
        roundId: round.id,
        sequence: state.sequence - 1,
      }),
    ).toBe(state);
    state = tracingReducer(state, {
      type: 'animationDone',
      roundId: round.id,
      sequence: state.sequence,
    });
    expect(state.phase).toBe('completed');
    state = tracingReducer(state, { type: 'replay' });
    expect(state.round).toBe(round);
    expect(state.completedOnce).toBe(true);
    const next = tracingReducer(state, { type: 'new', round: createTrace('easy') });
    expect(next.completedOnce).toBe(false);
    expect(
      tracingReducer(next, { type: 'animationDone', roundId: round.id, sequence: state.sequence }),
    ).toBe(next);
  });
});

describe('L11 bounded reproducible tracing templates', () => {
  test('all pairs/patterns/variants fit both mobile and desktop with fixed endpoints', () => {
    for (let c = 0; c < 4; c++)
      for (let p = 0; p < 3; p++)
        for (let v = 0; v < 2; v++) {
          const sequence = [(c + 0.1) / 4, (p + 0.1) / 3, (v + 0.1) / 2];
          let i = 0;
          const round = createTrace('easy', () => sequence[i++]);
          expect(round.companion).toBe(companions[c]);
          expect(round.pattern).toBe(patterns[p]);
          for (const width of [280, 700]) {
            const points = tracePoints(round, width);
            expect(points[0]).toEqual({ x: 32, y: 120 });
            expect(points.at(-1)!.x).toBe(width - 32);
            expect(
              points.every((p) => p.x >= 32 && p.x <= width - 32 && p.y > 40 && p.y < 200),
            ).toBe(true);
          }
          i = 0;
          expect(createTrace('easy', () => sequence[i++], round).pattern).not.toBe(round.pattern);
        }
  });
});
describe('L12 geometric tracing, no endpoint shortcut', () => {
  for (const level of ['easy', 'medium'] as Level[])
    for (const pattern of patterns)
      for (const variant of [0, 1]) {
        test(`${level}/${pattern}/${variant}: jitter accepted, partial/reversed/scribble/shortcut refused`, () => {
          const round = { ...createTrace(level), pattern, variant };
          const guide = tracePoints(round, 300);
          const jitter = guide.map((p, i) => ({
            x: p.x + Math.sin(i) * 2,
            y: p.y + Math.cos(i) * 2,
          }));
          expect(gradeTrace(jitter, guide, level).accepted).toBe(true);
          expect(gradeTrace(guide.slice(0, 110), guide, level).accepted).toBe(false);
          expect(gradeTrace([...guide].reverse(), guide, level).accepted).toBe(false);
          expect(
            gradeTrace([guide[0], { x: 150, y: 4 }, guide.at(-1)!], guide, level).accepted,
          ).toBe(false);
          if (pattern !== 'straight')
            expect(gradeTrace([guide[0], guide.at(-1)!], guide, level).accepted).toBe(false);
          else expect(gradeTrace([guide[0], guide.at(-1)!], guide, level).accepted).toBe(true);
        });
      }
  test('a tap/nonfinite point never completes', () => {
    const guide = tracePoints(createTrace('easy'), 300);
    expect(gradeTrace([guide[0]], guide, 'easy').accepted).toBe(false);
    expect(gradeTrace([guide[0], { x: NaN, y: 120 }, guide.at(-1)!], guide, 'easy').accepted).toBe(
      false,
    );
  });
});

test('L21 Easy accepts a 15px interior drift that Medium refuses without allowing shortcuts', () => {
  const round = { ...createTrace('easy'), pattern: 'straight' as const };
  const guide = tracePoints(round, 500);
  const drift = guide.map((p, i) => ({ x: p.x, y: p.y + (i > 5 && i < 235 ? 15 : 0) }));
  expect(gradeTrace(drift, guide, 'easy').accepted).toBe(true);
  expect(gradeTrace(drift, guide, 'medium').accepted).toBe(false);
});

describe('L06 connection judging', () => {
  test('counts determine answer even across rows; locked endpoints and invalid targets stay untouched', () => {
    const round = createMatching({ start: 1, end: 3 }, () => 0);
    expect(checkConnection(round, [], 3, 3)).toEqual({ source: 3, target: 3, correct: true });
    expect(checkConnection(round, [], 3, 2)?.correct).toBe(false);
    expect(checkConnection(round, [{ source: 3, target: 3, correct: true }], 1, 3)).toBeNull();
    expect(checkConnection(round, [], 1, 99)).toBeNull();
    const path = connectionPath({ x: 20, y: 300 }, { x: 500, y: 50 });
    expect(path.match(/M/g)).toHaveLength(1);
    expect(path.match(/C/g)).toHaveLength(1);
    expect(path).not.toContain('L');
  });
});
describe('L07 immutable correct matches and retry', () => {
  test('retry clears only the source error, completion locks all until explicit new round', () => {
    const round = createMatching({ start: 1, end: 3 }, () => 0);
    let state = initialMatching(round);
    state = matchingReducer(state, { type: 'connect', source: 1, target: 2 });
    state = matchingReducer(state, { type: 'connect', source: 2, target: 1 });
    state = matchingReducer(state, { type: 'connect', source: 3, target: 3 });
    const locked = state.connections.find((c) => c.correct)!;
    state = matchingReducer(state, { type: 'begin', source: 1 });
    expect(state.connections).toEqual([{ source: 2, target: 1, correct: false }, locked]);
    state = matchingReducer(state, { type: 'connect', source: 1, target: 1 });
    state = matchingReducer(state, { type: 'connect', source: 2, target: 2 });
    expect(state.connections.filter((c) => c.correct)).toHaveLength(3);
    expect(state.message).toContain('Hoàn thành');
    expect(matchingReducer(state, { type: 'begin', source: 3 })).toBe(state);
    expect(matchingReducer(state, { type: 'connect', source: 3, target: 1 }).connections).toEqual(
      state.connections,
    );
    expect(
      matchingReducer(state, { type: 'reset', round: createMatching({ start: 2, end: 5 }) })
        .connections,
    ).toEqual([]);
  });
});

describe('L05 drawing geometry', () => {
  test('maps viewport after scroll/scale without clamping outside or depending on DPR', () => {
    const rect = { left: 100, top: -200, width: 200, height: 100 };
    expect(clientPoint(200, -150, rect, 1000, 500)).toEqual({ x: 500, y: 250 });
    expect(clientPoint(90, -150, rect, 1000, 500).x).toBe(-50);
    expect(() => clientPoint(NaN, 2, rect, 10, 10)).toThrow();
    expect(() => clientPoint(1, 2, { ...rect, width: 0 }, 10, 10)).toThrow();
  });
  test('resamples sparse events and removes duplicate noise with bounded memory', () => {
    const sampled = resample([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
    expect(sampled).toHaveLength(26);
    expect(pathLength(sampled)).toBe(100);
    expect(resample([{ x: NaN, y: 0 }])).toEqual([]);
    expect(
      resample([
        { x: 0, y: 0 },
        { x: 1e9, y: 0 },
      ]).length,
    ).toBeLessThanOrEqual(8193);
    expect(connectionPath({ x: 0, y: 0 }, { x: 100, y: 100 })).toBe('M0,0 C42,0 58,100 100,100');
  });
});

describe('L04 matching generation', () => {
  test('all ranges create every pair exactly once and shuffled targets', () => {
    for (let start = 1; start < 10; start++)
      for (let end = start + 1; end <= 10; end++)
        for (const sample of [0, 0.4, 0.999]) {
          const round = createMatching({ start, end }, () => sample);
          const wanted = Array.from({ length: end - start + 1 }, (_, i) => start + i);
          expect(round.numbers).toEqual(wanted);
          expect([...round.targets].sort((a, b) => a - b)).toEqual(wanted);
          expect(round.targets).not.toEqual(wanted);
          expect(new Set(round.targets).size).toBe(wanted.length);
        }
    expect(() => createMatching({ start: 5, end: 5 })).toThrow();
  });
});

describe('L03 range last edited field', () => {
  test.each([
    [{ start: 1, end: 5 }, 'start', '7', { start: 4, end: 5 }],
    [{ start: 3, end: 6 }, 'end', '2', { start: 3, end: 4 }],
    [{ start: 1, end: 2 }, 'start', '10', { start: 1, end: 2 }],
    [{ start: 9, end: 10 }, 'end', '1', { start: 9, end: 10 }],
    [{ start: 2, end: 5 }, 'start', '0', { start: 4, end: 5 }],
    [{ start: 2, end: 5 }, 'end', '11', { start: 2, end: 3 }],
    [{ start: 1, end: 5 }, 'end', '10', { start: 1, end: 10 }],
    [{ start: 3, end: 7 }, 'start', '', { start: 6, end: 7 }],
    [{ start: 3, end: 7 }, 'end', '3.5', { start: 3, end: 4 }],
  ] as const)('normalizes %j %s=%s', (range, field, raw, expected) =>
    expect(commitRange(range, field, raw)).toEqual(expected),
  );
  test('all 45 ranges remain valid for hostile edits and preserve the opposite field', () => {
    let total = 0;
    for (let start = 1; start < 10; start++)
      for (let end = start + 1; end <= 10; end++) {
        total++;
        for (const raw of ['', '-1', '0', '1', '4', '10', '11', 'Infinity', 'NaN', '3.5'])
          for (const field of ['start', 'end'] as const) {
            const result = commitRange({ start, end }, field, raw);
            expect(validRange(result)).toBe(true);
            expect(result[field === 'start' ? 'end' : 'start']).toBe(
              field === 'start' ? end : start,
            );
          }
      }
    expect(total).toBe(45);
  });
});
