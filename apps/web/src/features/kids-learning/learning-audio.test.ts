import { test, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { createLearningAudio, voiceIds } from './learning-audio';
class TestVoice extends EventTarget {
  currentTime = 0;
  pause = vi.fn();
  play = vi.fn(() => Promise.resolve());
}
afterEach(() => vi.useRealTimers());
test('L23 static Vietnamese clips have transcripts, real MP3 bytes and matching checksums', () => {
  const root = resolve('public/audio/kids-learning');
  const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
  expect(manifest.language).toBe('vi-VN');
  expect(manifest.voice).toBe('vi-VN-HoaiMyNeural');
  expect(manifest.revision).toBe(1);
  expect(manifest.clips.map((c: { id: string }) => c.id)).toEqual(voiceIds);
  for (const clip of manifest.clips) {
    const bytes = readFileSync(resolve(root, clip.id + '.mp3'));
    expect(bytes.length).toBeGreaterThan(10000);
    expect(clip.transcript.length).toBeGreaterThan(10);
    expect(clip.durationSeconds).toBeGreaterThan(1);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(clip.sha256);
  }
});
test('L23 switches/mutes/cancels stale failures and retry never overlaps voices', async () => {
  let reject: (e: Error) => void = () => {};
  vi.useFakeTimers();
  const error = vi.fn();
  const voices: TestVoice[] = [];
  const controller = createLearningAudio(error, true, () => {
    const voice = new TestVoice();
    if (voices.length === 0)
      voice.play.mockImplementation(
        () =>
          new Promise((_resolve, r) => {
            reject = r;
          }),
      );
    voices.push(voice);
    return voice;
  });
  controller.play('matching');
  controller.play('bee');
  controller.play('dog');
  expect(voices[0].pause).toHaveBeenCalled();
  expect(voices[1].pause).toHaveBeenCalled();
  reject(new Error('old'));
  await Promise.resolve();
  expect(error).not.toHaveBeenCalledWith(expect.any(String));
  voices[2].dispatchEvent(new Event('error'));
  expect(error).toHaveBeenCalledWith(expect.stringContaining('vẫn chơi'));
  controller.retry();
  expect(voices).toHaveLength(4);
  controller.setEnabled(false);
  expect(voices[3].pause).toHaveBeenCalled();
  controller.play('bee');
  expect(voices).toHaveLength(4);
  controller.setEnabled(true);
  controller.play('bee');
  controller.stop();
  vi.advanceTimersByTime(20000);
  expect(voices[4].pause).toHaveBeenCalled();
});
