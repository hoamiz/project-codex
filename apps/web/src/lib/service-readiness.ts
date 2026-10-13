export type ReadinessPhase = 'checking' | 'waiting' | 'ready' | 'offline' | 'timeout';
export interface ReadinessState {
  phase: ReadinessPhase;
  elapsedSeconds: number;
  hadReady: boolean;
}
export interface ReadinessOptions {
  check: (signal: AbortSignal) => Promise<boolean>;
  onChange: (state: ReadinessState) => void;
  onRecovered?: () => void;
  online?: () => boolean;
  visible?: () => boolean;
  requestTimeoutMs?: number;
  maxWaitMs?: number;
  retryDelayMs?: number;
  random?: () => number;
}

/** Health phải là JSON200 của app/DB; HTML loading200 của hosting không được xem là đã hồi phục. */
export async function checkServiceHealth(signal: AbortSignal): Promise<boolean> {
  const response = await fetch('/api/health', {
    signal,
    cache: 'no-store',
    credentials: 'same-origin',
  });
  if (
    response.status !== 200 ||
    !response.headers.get('content-type')?.includes('application/json')
  )
    return false;
  const body: unknown = await response.json();
  return (
    !!body &&
    typeof body === 'object' &&
    'data' in body &&
    !!body.data &&
    typeof body.data === 'object' &&
    'status' in body.data &&
    body.data.status === 'ok'
  );
}

/** Một request mỗi lượt, deadline hữu hạn và generation chống response cũ. Sau ready chỉ kiểm tra lại khi API lỗi, không ping nền giữ hosting luôn thức. */
export function createReadinessMonitor(options: ReadinessOptions) {
  const requestTimeoutMs = options.requestTimeoutMs ?? 8000;
  const maxWaitMs = options.maxWaitMs ?? 120000;
  const retryDelayMs = options.retryDelayMs ?? 5000;
  const online = options.online ?? (() => navigator.onLine);
  const visible = options.visible ?? (() => document.visibilityState !== 'hidden');
  const random = options.random ?? Math.random;
  let state: ReadinessState = { phase: 'checking', elapsedSeconds: 0, hadReady: false };
  let generation = 0,
    disposed = false,
    startedAt = 0,
    quietUntil = 0;
  let poll: ReturnType<typeof setTimeout> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let tick: ReturnType<typeof setInterval> | undefined;
  let controller: AbortController | undefined;
  const emit = (phase: ReadinessPhase) => {
    state = {
      phase,
      elapsedSeconds: Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      hadReady: state.hadReady || phase === 'ready',
    };
    if (!disposed) options.onChange({ ...state });
  };
  const cancel = () => {
    generation++;
    clearTimeout(poll);
    clearTimeout(timeout);
    clearTimeout(deadline);
    clearInterval(tick);
    controller?.abort();
    controller = undefined;
  };
  const attempt = async (epoch: number) => {
    if (disposed || epoch !== generation) return;
    if (!online()) {
      cancel();
      emit('offline');
      return;
    }
    if (!visible()) {
      cancel();
      emit('waiting');
      return;
    }
    const request = new AbortController();
    controller = request;
    timeout = setTimeout(() => request.abort(), requestTimeoutMs);
    let ready = false;
    try {
      ready = await options.check(request.signal);
    } catch {
      /* Timeout/network/HTML chưa ready đều vào cùng lượt retry có giới hạn. */
    }
    if (disposed || epoch !== generation) return;
    clearTimeout(timeout);
    controller = undefined;
    if (ready) {
      const recovered = state.hadReady;
      cancel();
      emit('ready');
      // Refetch có thể vẫn gặp lỗi riêng endpoint; cooldown ngăn vòng health→refetch→health vô hạn.
      if (recovered) {
        quietUntil = Date.now() + 10000;
        options.onRecovered?.();
      }
    } else {
      emit('waiting');
      poll = setTimeout(() => void attempt(epoch), retryDelayMs + Math.floor(random() * 500));
    }
  };
  const start = () => {
    if (disposed) return;
    cancel();
    startedAt = Date.now();
    if (!online()) {
      emit('offline');
      return;
    }
    if (!visible()) {
      emit('waiting');
      return;
    }
    emit('checking');
    const epoch = generation;
    deadline = setTimeout(() => {
      if (epoch === generation) {
        cancel();
        emit('timeout');
      }
    }, maxWaitMs);
    tick = setInterval(() => emit(state.phase), 1000);
    void attempt(epoch);
  };
  return {
    start,
    retry: start,
    unavailable: () => {
      if (state.phase === 'ready' && Date.now() >= quietUntil) start();
    },
    offline: () => {
      if (!disposed) {
        cancel();
        emit('offline');
      }
    },
    visibility: () => {
      if (state.phase === 'ready' || disposed) return;
      if (visible()) start();
      else {
        cancel();
        emit('waiting');
      }
    },
    resume: () => {
      if (state.phase !== 'ready' && !disposed) start();
    },
    dispose: () => {
      disposed = true;
      cancel();
    },
  };
}
