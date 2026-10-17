import { useCallback, useEffect, useRef, useState } from 'react';
import { assetUrl } from './asset-url';
import { companions } from './lessons';
import { discoveryVoiceIds } from './discovery-lessons';
export const voiceIds = [
  'matching',
  ...companions.map((companion) => companion.id),
  'success',
  'retry',
  'complete',
  'tracing',
  ...discoveryVoiceIds,
] as const;
export const soundKey = 'project-codex:kids-learning:sound:v1';
interface Voice extends EventTarget {
  play: () => Promise<void>;
  pause: () => void;
  currentTime: number;
}
/** Token chống promise/audio cũ ghi lỗi vào lượt mới; chỉ có một giọng và lỗi không tác động bộ chấm. */
export function createLearningAudio(
  notify: (error: string | null) => void,
  enabled = true,
  factory: (url: string) => Voice = (url) => new Audio(url),
) {
  let current: Voice | null = null,
    token = 0,
    cleanup = () => {},
    last = 'matching';
  function stop() {
    token++;
    cleanup();
    cleanup = () => {};
    if (current) {
      current.pause();
      try {
        current.currentTime = 0;
      } catch {
        /* Chưa có metadata vẫn được phép dừng. */
      }
    }
    current = null;
  }
  function play(id: string) {
    if (!enabled || !voiceIds.includes(id as (typeof voiceIds)[number])) return;
    stop();
    last = id;
    notify(null);
    const generation = token;
    const voice = factory(assetUrl(`/audio/kids-learning/${id}.mp3?v=1`));
    current = voice;
    const fail = () => {
      if (generation === token) {
        stop();
        notify('Chưa phát được giọng hướng dẫn. Con vẫn chơi bình thường nhé.');
      }
    };
    const end = () => {
      if (generation === token) {
        cleanup();
        cleanup = () => {};
        current = null;
      }
    };
    const timeout = setTimeout(fail, 12000);
    voice.addEventListener('error', fail);
    voice.addEventListener('ended', end);
    cleanup = () => {
      clearTimeout(timeout);
      voice.removeEventListener('error', fail);
      voice.removeEventListener('ended', end);
    };
    try {
      void voice.play().catch(fail);
    } catch {
      fail();
    }
  }
  return {
    play,
    stop,
    retry: () => play(last),
    setEnabled: (value: boolean) => {
      enabled = value;
      if (!value) {
        stop();
        notify(null);
      }
    },
  };
}
/** Chỉ lưu sở thích âm thanh của thiết bị; storage bị chặn không cản việc chơi hoặc tắt tiếng. */
export function useLearningAudio() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(soundKey) !== 'off';
    } catch {
      return true;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<ReturnType<typeof createLearningAudio> | null>(null);
  if (!controller.current) controller.current = createLearningAudio(setError, enabled);
  const speak = useCallback((id: string) => controller.current!.play(id), []);
  const stop = useCallback(() => controller.current!.stop(), []);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    document.addEventListener('visibilitychange', hidden);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [stop]);
  const toggle = () => {
    const next = !enabled;
    controller.current!.setEnabled(next);
    setEnabled(next);
    try {
      localStorage.setItem(soundKey, next ? 'on' : 'off');
    } catch {
      /* Sở thích vẫn có hiệu lực trong phiên. */
    }
  };
  return { enabled, error, speak, stop, toggle, retry: () => controller.current!.retry() };
}
