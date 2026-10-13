import { beforeEach, afterEach, test, expect, vi } from 'vitest';
import {
  checkServiceHealth,
  createReadinessMonitor,
  type ReadinessState,
} from './service-readiness';
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function harness(
  check: (signal: AbortSignal) => Promise<boolean>,
  online = () => true,
  visible = () => true,
) {
  const states: ReadinessState[] = [];
  const recovered = vi.fn();
  const monitor = createReadinessMonitor({
    check,
    onChange: (state) => states.push(state),
    onRecovered: recovered,
    online,
    visible,
    random: () => 0,
    requestTimeoutMs: 80,
    maxWaitMs: 1200,
    retryDelayMs: 50,
  });
  return { monitor, states, recovered };
}
test('ready immediately stops all timers and does not keep service awake', async () => {
  const check = vi.fn(async () => true);
  const { monitor, states } = harness(check);
  monitor.start();
  await vi.advanceTimersByTimeAsync(0);
  expect(states.at(-1)?.phase).toBe('ready');
  expect(states.at(-1)?.hadReady).toBe(true);
  await vi.advanceTimersByTimeAsync(300000);
  expect(check).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
  monitor.dispose();
});
test('failed checks retry sequentially then recover once; events cannot create a refetch loop', async () => {
  const check = vi
    .fn<(signal: AbortSignal) => Promise<boolean>>()
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(false)
    .mockResolvedValue(true);
  const { monitor, states, recovered } = harness(check);
  monitor.start();
  await vi.advanceTimersByTimeAsync(0);
  monitor.unavailable();
  await vi.advanceTimersByTimeAsync(0);
  expect(states.at(-1)?.phase).toBe('waiting');
  expect(states.at(-1)?.hadReady).toBe(true);
  await vi.advanceTimersByTimeAsync(50);
  expect(states.at(-1)?.phase).toBe('ready');
  expect(recovered).toHaveBeenCalledOnce();
  monitor.unavailable();
  await vi.advanceTimersByTimeAsync(0);
  expect(check).toHaveBeenCalledTimes(3);
  monitor.dispose();
});
test('abort request timeout before next request and enforce total deadline', async () => {
  let active = 0,
    maxActive = 0;
  const check = vi.fn(
    (signal: AbortSignal) =>
      new Promise<boolean>((_resolve, reject) => {
        active++;
        maxActive = Math.max(maxActive, active);
        signal.addEventListener(
          'abort',
          () => {
            active--;
            reject(new DOMException('cancelled', 'AbortError'));
          },
          { once: true },
        );
      }),
  );
  const { monitor, states } = harness(check);
  monitor.start();
  await vi.advanceTimersByTimeAsync(1250);
  expect(states.at(-1)?.phase).toBe('timeout');
  expect(active).toBe(0);
  expect(maxActive).toBe(1);
  expect(check.mock.calls.length).toBeGreaterThan(1);
  expect(vi.getTimerCount()).toBe(0);
  monitor.dispose();
});
test('late response cannot undo timeout and retry starts a new bounded cycle', async () => {
  let late: (ready: boolean) => void = () => {};
  const check = vi
    .fn<(signal: AbortSignal) => Promise<boolean>>()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          late = resolve;
        }),
    )
    .mockResolvedValue(true);
  const { monitor, states } = harness(check);
  monitor.start();
  await vi.advanceTimersByTimeAsync(1200);
  late(true);
  await vi.advanceTimersByTimeAsync(0);
  expect(states.at(-1)?.phase).toBe('timeout');
  monitor.retry();
  await vi.advanceTimersByTimeAsync(0);
  expect(states.at(-1)?.phase).toBe('ready');
  monitor.dispose();
});
test('offline does not send requests; online resumes without losing ready history', async () => {
  let connected = false;
  const check = vi.fn(async () => true);
  const { monitor, states } = harness(check, () => connected);
  monitor.start();
  expect(states.at(-1)?.phase).toBe('offline');
  expect(check).not.toHaveBeenCalled();
  connected = true;
  monitor.resume();
  await vi.advanceTimersByTimeAsync(0);
  expect(states.at(-1)?.phase).toBe('ready');
  connected = false;
  monitor.offline();
  expect(states.at(-1)?.hadReady).toBe(true);
  expect(states.at(-1)?.phase).toBe('offline');
  connected = true;
  monitor.resume();
  await vi.advanceTimersByTimeAsync(0);
  expect(states.at(-1)?.hadReady).toBe(true);
  monitor.dispose();
});
test('hidden document pauses retries, and dispose aborts active request without notifications', async () => {
  let visible = true;
  const check = vi.fn(async () => false);
  const { monitor, states } = harness(
    check,
    () => true,
    () => visible,
  );
  monitor.start();
  await vi.advanceTimersByTimeAsync(0);
  visible = false;
  monitor.visibility();
  await vi.advanceTimersByTimeAsync(10000);
  expect(check).toHaveBeenCalledOnce();
  visible = true;
  monitor.visibility();
  await vi.advanceTimersByTimeAsync(0);
  expect(check).toHaveBeenCalledTimes(2);
  monitor.dispose();
  const count = states.length;
  await vi.advanceTimersByTimeAsync(5000);
  expect(states).toHaveLength(count);
  expect(vi.getTimerCount()).toBe(0);
});
test('explicit retry ignores previous generation and dispose aborts its pending request', async () => {
  const signals: AbortSignal[] = [];
  const resolvers: ((ready: boolean) => void)[] = [];
  const { monitor, states } = harness(
    (signal) =>
      new Promise((resolve) => {
        signals.push(signal);
        resolvers.push(resolve);
      }),
  );
  monitor.start();
  monitor.retry();
  expect(signals[0].aborted).toBe(true);
  resolvers[0](true);
  await vi.advanceTimersByTimeAsync(0);
  expect(states.at(-1)?.phase).toBe('checking');
  monitor.dispose();
  expect(signals[1].aborted).toBe(true);
  const count = states.length;
  resolvers[1](true);
  await vi.advanceTimersByTimeAsync(0);
  expect(states).toHaveLength(count);
});
test('health requires real app JSON200 and bypasses cache', async () => {
  const responses = [
    new Response('<html>Starting</html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }),
    new Response(JSON.stringify({ data: { status: 'ok' } }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }),
    new Response(JSON.stringify({ data: { status: 'wrong' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
    new Response(JSON.stringify({ data: { status: 'ok' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  ];
  const fetch = vi.fn().mockImplementation(async () => responses.shift());
  vi.stubGlobal('fetch', fetch);
  for (const expected of [false, false, false, true])
    expect(await checkServiceHealth(new AbortController().signal)).toBe(expected);
  expect(fetch.mock.calls[0][1].cache).toBe('no-store');
});
