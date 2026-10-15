import { useEffect, useRef } from 'react';

/** Đếm thời gian khi trang hiện; rời bài/đổi đề/mở hướng dẫn dọn callback, không tự tăng tiến độ ở nền. */
export function useVisibleDelay(
  active: boolean,
  duration: number,
  token: string,
  callback: () => void,
) {
  const current = useRef(callback);
  current.current = callback;
  useEffect(() => {
    if (!active) return;
    let remaining = duration,
      timer = 0,
      since = performance.now(),
      running = false,
      finished = false;
    const arm = () => {
      since = performance.now();
      running = true;
      timer = window.setTimeout(
        () => {
          running = false;
          finished = true;
          current.current();
        },
        Math.max(1, remaining),
      );
    };
    const visibility = () => {
      if (document.hidden && running) {
        clearTimeout(timer);
        remaining = Math.max(1, remaining - (performance.now() - since));
        running = false;
      } else if (!document.hidden && !running && !finished) arm();
    };
    if (!document.hidden) arm();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [active, duration, token]);
}
