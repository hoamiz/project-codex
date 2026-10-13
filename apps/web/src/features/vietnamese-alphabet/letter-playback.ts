export type PlaybackState = 'idle' | 'loading' | 'playing' | 'finished' | 'error';
type AudioPort = Pick<
  HTMLAudioElement,
  'play' | 'pause' | 'addEventListener' | 'removeEventListener'
>;
type Options = {
  createAudio: (url: string) => AudioPort;
  onState: (state: PlaybackState) => void;
  onFinished: () => void;
};
export const CLOSE_DELAY_MS = 3000;
const LOAD_TIMEOUT_MS = 12000;

/** Một audio/lượt; chỉ ended hiện tại mới đóng sau3 giây. Cancel vô hiệu callback cũ và giải phóng timer/listener. */
export function createLetterPlayback({ createAudio, onState, onFinished }: Options) {
  let generation = 0;
  let release: (() => void) | undefined;

  function stop() {
    generation++;
    release?.();
    release = undefined;
  }

  /** Gọi trực tiếp trong click để giữ user activation trên iOS, không đợi effect/giọng máy. */
  function start(url: string) {
    stop();
    const current = generation;
    let audio: AudioPort;
    try {
      audio = createAudio(url);
    } catch {
      onState('error');
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let terminal = false;
    const active = () => current === generation && !terminal;
    const clearTimer = () => clearTimeout(timer);
    const fail = () => {
      if (!active()) return;
      terminal = true;
      clearTimer();
      audio.pause();
      onState('error');
    };
    const loading = () => {
      if (!active()) return;
      clearTimer();
      onState('loading');
      timer = setTimeout(fail, LOAD_TIMEOUT_MS);
    };
    const playing = () => {
      if (!active()) return;
      clearTimer();
      onState('playing');
    };
    const ended = () => {
      if (!active()) return;
      terminal = true;
      clearTimer();
      onState('finished');
      timer = setTimeout(() => {
        if (current === generation) {
          stop();
          onFinished();
        }
      }, CLOSE_DELAY_MS);
    };
    const handlers = { playing, waiting: loading, stalled: loading, ended, error: fail };
    for (const [name, handler] of Object.entries(handlers)) audio.addEventListener(name, handler);
    release = () => {
      clearTimer();
      for (const [name, handler] of Object.entries(handlers))
        audio.removeEventListener(name, handler);
      audio.pause();
    };
    loading();
    try {
      void audio.play().catch(fail);
    } catch {
      fail();
    }
  }
  return { start, stop };
}
