import { afterEach, beforeEach, test, expect, vi } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { useVisibleDelay } from './use-visible-delay';
const descriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
function Clock({
  active = true,
  token = 'round',
  done,
}: {
  active?: boolean;
  token?: string;
  done: () => void;
}) {
  useVisibleDelay(active, 1400, token, done);
  return null;
}
beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  if (descriptor) Object.defineProperty(document, 'hidden', descriptor);
  else Reflect.deleteProperty(document, 'hidden');
});
test('K07 visible clock pauses in background, ignores repeated hide events and fires once', () => {
  const done = vi.fn();
  render(<Clock done={done} />);
  act(() => {
    vi.advanceTimersByTime(400);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(3000);
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(done).not.toHaveBeenCalled();
  act(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(999);
  });
  expect(done).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(done).toHaveBeenCalledOnce();
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(3000);
  });
  expect(done).toHaveBeenCalledOnce();
});
test('K07 blocking and route unmount discard callbacks', () => {
  const done = vi.fn();
  const view = render(<Clock done={done} />);
  act(() => vi.advanceTimersByTime(1000));
  view.rerender(<Clock active={false} done={done} />);
  act(() => vi.advanceTimersByTime(5000));
  expect(done).not.toHaveBeenCalled();
  view.rerender(<Clock done={done} />);
  view.unmount();
  act(() => vi.advanceTimersByTime(5000));
  expect(done).not.toHaveBeenCalled();
});
test('K07 a new round resets the delay and cannot receive the old callback', () => {
  const old = vi.fn(),
    fresh = vi.fn();
  const view = render(<Clock done={old} />);
  act(() => vi.advanceTimersByTime(1300));
  view.rerender(<Clock token="new" done={fresh} />);
  act(() => vi.advanceTimersByTime(100));
  expect(old).not.toHaveBeenCalled();
  expect(fresh).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1300));
  expect(fresh).toHaveBeenCalledOnce();
});
