import { afterEach, expect, test, vi } from 'vitest';
import { createLetterPlayback } from './letter-playback';

class TestAudio extends EventTarget {
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
}
function fixture() {
  vi.useFakeTimers();
  const audios: TestAudio[] = [];
  const onState = vi.fn(),
    onFinished = vi.fn();
  const playback = createLetterPlayback({
    createAudio: () => {
      const audio = new TestAudio();
      audios.push(audio);
      return audio;
    },
    onState,
    onFinished,
  });
  return { ...playback, audios, onState, onFinished };
}
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

test('does not close while loading/reading; waits exactly3 seconds after the current ended', () => {
  const f = fixture();
  f.start('/a.mp3');
  expect(f.audios[0].play).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(7000);
  expect(f.onFinished).not.toHaveBeenCalled();
  f.audios[0].dispatchEvent(new Event('playing'));
  vi.advanceTimersByTime(20000);
  expect(f.onFinished).not.toHaveBeenCalled();
  f.audios[0].dispatchEvent(new Event('ended'));
  expect(f.onState).toHaveBeenLastCalledWith('finished');
  vi.advanceTimersByTime(2999);
  expect(f.onFinished).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(f.onFinished).toHaveBeenCalledOnce();
  expect(f.audios[0].pause).toHaveBeenCalledOnce();
  f.audios[0].dispatchEvent(new Event('ended'));
  vi.advanceTimersByTime(3000);
  expect(f.onFinished).toHaveBeenCalledOnce();
});
test('closing during playback or countdown cancels audio, callbacks and timers', () => {
  const f = fixture();
  f.start('/a.mp3');
  f.audios[0].dispatchEvent(new Event('ended'));
  f.stop();
  vi.advanceTimersByTime(4000);
  expect(f.onFinished).not.toHaveBeenCalled();
  f.start('/b.mp3');
  f.stop();
  const updates = f.onState.mock.calls.length;
  f.audios[1].dispatchEvent(new Event('playing'));
  f.audios[1].dispatchEvent(new Event('ended'));
  expect(f.onState).toHaveBeenCalledTimes(updates);
  expect(f.audios.every((a) => a.pause.mock.calls.length === 1)).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
test('changing letters stops the old clip and ignores its late ended/error/rejection', async () => {
  vi.useFakeTimers();
  const onState = vi.fn(),
    onFinished = vi.fn();
  let reject!: (error: Error) => void;
  // Một promise lỗi cũ cũng không được làm hỏng state của audio kế tiếp.
  const old = new TestAudio();
  old.play.mockImplementation(
    () =>
      new Promise((_resolve, rejectPlay) => {
        reject = rejectPlay;
      }),
  );
  const current = new TestAudio();
  const createAudio = vi.fn().mockReturnValueOnce(old).mockReturnValueOnce(current);
  const p = createLetterPlayback({ createAudio, onState, onFinished });
  p.start('/a.mp3');
  p.start('/b.mp3');
  current.dispatchEvent(new Event('playing'));
  reject(new Error('old failure'));
  await Promise.resolve();
  old.dispatchEvent(new Event('error'));
  old.dispatchEvent(new Event('ended'));
  expect(onState).toHaveBeenLastCalledWith('playing');
  vi.advanceTimersByTime(3000);
  expect(onFinished).not.toHaveBeenCalled();
  expect(old.pause).toHaveBeenCalledOnce();
  p.stop();
});
test('blocked play reports an error and stays open until a successful retry finishes', async () => {
  const onState = vi.fn(),
    onFinished = vi.fn();
  const denied = new TestAudio(),
    retry = new TestAudio();
  denied.play.mockRejectedValueOnce(new Error('NotAllowedError'));
  const p = createLetterPlayback({
    createAudio: vi.fn().mockReturnValueOnce(denied).mockReturnValueOnce(retry),
    onState,
    onFinished,
  });
  vi.useFakeTimers();
  p.start('/a.mp3');
  await Promise.resolve();
  expect(onState).toHaveBeenLastCalledWith('error');
  vi.advanceTimersByTime(20000);
  expect(onFinished).not.toHaveBeenCalled();
  p.start('/a.mp3');
  retry.dispatchEvent(new Event('playing'));
  retry.dispatchEvent(new Event('ended'));
  vi.advanceTimersByTime(3000);
  expect(onFinished).toHaveBeenCalledOnce();
});
test('network timeout/stall and decode error never pretend the reading ended', () => {
  const f = fixture();
  f.start('/a.mp3');
  vi.advanceTimersByTime(12000);
  expect(f.onState).toHaveBeenLastCalledWith('error');
  f.audios[0].dispatchEvent(new Event('ended'));
  vi.advanceTimersByTime(3000);
  expect(f.onFinished).not.toHaveBeenCalled();
  f.start('/a.mp3');
  f.audios[1].dispatchEvent(new Event('playing'));
  f.audios[1].dispatchEvent(new Event('waiting'));
  vi.advanceTimersByTime(12000);
  expect(f.onState).toHaveBeenLastCalledWith('error');
  f.start('/a.mp3');
  f.audios[2].dispatchEvent(new Event('error'));
  vi.advanceTimersByTime(3000);
  expect(f.onFinished).not.toHaveBeenCalled();
  f.stop();
});
test('unsupported audio creation is a recoverable error', () => {
  const onState = vi.fn();
  const p = createLetterPlayback({
    createAudio: () => {
      throw new Error('Unavailable');
    },
    onState,
    onFinished: vi.fn(),
  });
  expect(() => p.start('/a.mp3')).not.toThrow();
  expect(onState).toHaveBeenLastCalledWith('error');
});
