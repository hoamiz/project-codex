import { beforeEach, afterEach, test, expect, vi } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { LessonAnimation } from './lesson-animation';
import { createTrace } from './tracing-core';

const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'animate');
const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
let reduced = false;
let animation: {
  currentTime: number;
  onfinish: null | (() => void);
  pause: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
};
let animate: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers();
  reduced = false;
  vi.stubGlobal('matchMedia', () => ({
    matches: reduced,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  animation = { currentTime: 0, onfinish: null, pause: vi.fn(), play: vi.fn(), cancel: vi.fn() };
  animate = vi.fn(() => animation);
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (original) Object.defineProperty(HTMLElement.prototype, 'animate', original);
  else Reflect.deleteProperty(HTMLElement.prototype, 'animate');
  if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor);
  else Reflect.deleteProperty(document, 'hidden');
});
test('L16 hidden pauses animation and its watchdog, resumes and completes once', () => {
  const done = vi.fn();
  render(<LessonAnimation round={createTrace('easy')} width={300} sequence={1} onDone={done} />);
  act(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(10000);
  });
  expect(animation.pause).toHaveBeenCalledOnce();
  expect(done).not.toHaveBeenCalled();
  act(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(animation.play).toHaveBeenCalledOnce();
  act(() => {
    animation.onfinish?.();
    animation.onfinish?.();
    vi.advanceTimersByTime(10000);
  });
  expect(done).toHaveBeenCalledOnce();
});
test('L16 unmount cancels timeline and stale callbacks', () => {
  const done = vi.fn();
  const view = render(
    <LessonAnimation round={createTrace('easy')} width={300} sequence={1} onDone={done} />,
  );
  const oldFinish = animation.onfinish;
  view.unmount();
  act(() => {
    oldFinish?.();
    vi.advanceTimersByTime(10000);
  });
  expect(animation.cancel).toHaveBeenCalledOnce();
  expect(done).not.toHaveBeenCalled();
});
test('L16 reduced motion has no travel and lost finish has a bounded watchdog', () => {
  reduced = true;
  const done = vi.fn();
  render(<LessonAnimation round={createTrace('easy')} width={300} sequence={1} onDone={done} />);
  expect(animate.mock.calls[0][0]).toEqual([
    { offsetDistance: '100%', opacity: 0 },
    { offsetDistance: '100%', opacity: 1 },
  ]);
  act(() => vi.advanceTimersByTime(3220));
  expect(done).toHaveBeenCalledOnce();
});
test('L16 unavailable animation API restores a static scene without an uncaught error', () => {
  animate.mockImplementation(() => {
    throw new Error('unsupported');
  });
  const done = vi.fn();
  render(<LessonAnimation round={createTrace('easy')} width={300} sequence={1} onDone={done} />);
  act(() => vi.advanceTimersByTime(220));
  expect(done).toHaveBeenCalledOnce();
});
