import { useEffect, useRef, useState } from 'react';
import { polyline } from './drawing-core';
import { tracePoints, type TraceRound } from './tracing-core';

/** Một timeline thật điều khiển di chuyển/hành động; callback chỉ sống trong round/token hiện tại. */
export function LessonAnimation({
  round,
  width,
  sequence,
  onDone,
}: {
  round: TraceRound;
  width: number;
  sequence: number;
  onDone: () => void;
}) {
  const actor = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const savedTime = useRef(0);
  const [feeding, setFeeding] = useState(false);
  const guide = tracePoints(round, width);
  const companion = round.companion;
  useEffect(() => {
    const el = actor.current;
    if (!el) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = media.matches;
    const duration = reduced ? 220 : 3000;
    let alive = true,
      completed = false,
      frame = 0,
      watchdog = 0;
    let remaining = duration + 3000,
      visibleAt = performance.now();
    const finish = () => {
      if (alive && !completed) {
        completed = true;
        doneRef.current();
      }
    };
    let animation: Animation;
    try {
      animation = el.animate(
        reduced
          ? [
              { offsetDistance: '100%', opacity: 0 },
              { offsetDistance: '100%', opacity: 1 },
            ]
          : [
              { offsetDistance: '0%', offset: 0 },
              { offsetDistance: '100%', offset: 0.66 },
              { offsetDistance: '100%', offset: 1 },
            ],
        { duration, fill: 'forwards', easing: 'linear' },
      );
    } catch {
      // Trình duyệt thiếu WAAPI vẫn trả về bài sau cảnh tĩnh, không làm mất kết quả chấm.
      el.style.offsetDistance = '100%';
      setFeeding(true);
      const fallback = window.setTimeout(finish, 220);
      return () => {
        alive = false;
        clearTimeout(fallback);
      };
    }
    animation.currentTime = savedTime.current;
    animation.onfinish = finish;
    const arm = () => {
      visibleAt = performance.now();
      watchdog = window.setTimeout(finish, remaining);
    };
    const visibility = () => {
      if (document.hidden) {
        animation.pause();
        clearTimeout(watchdog);
        remaining = Math.max(1, remaining - (performance.now() - visibleAt));
      } else {
        animation.play();
        arm();
      }
    };
    const motion = () => {
      if (media.matches) finish();
    };
    const tick = () => {
      if (!alive) return;
      const time = Number(animation.currentTime || 0);
      setFeeding(reduced || time >= duration * 0.66);
      frame = requestAnimationFrame(tick);
    };
    arm();
    if (document.hidden) visibility();
    tick();
    document.addEventListener('visibilitychange', visibility);
    media.addEventListener('change', motion);
    return () => {
      savedTime.current = Number(animation.currentTime || 0);
      alive = false;
      clearTimeout(watchdog);
      cancelAnimationFrame(frame);
      animation.onfinish = null;
      animation.cancel();
      document.removeEventListener('visibilitychange', visibility);
      media.removeEventListener('change', motion);
    };
  }, [round.id, sequence, width]);
  return (
    <div
      className="lesson-animation"
      data-scene={companion.id}
      aria-label={`Hoạt cảnh ${companion.action}`}
    >
      <p className="animation-caption" role="status">
        {feeding ? companion.action : 'Một chuyến đi thật vui!'}
      </p>
      <div className="animation-landscape" style={{ height: 240 }}>
        <svg viewBox={`0 0 ${width} 240`} preserveAspectRatio="none" aria-hidden="true">
          <path
            d={polyline(guide)}
            fill="none"
            stroke="#bdcfa7"
            strokeWidth="4"
            strokeDasharray="1 12"
            strokeLinecap="round"
          />
        </svg>
        <img
          className="animation-destination"
          src={`/images/kids-learning/${companion.destination}.svg`}
          alt={companion.target}
          style={{ left: guide.at(-1)!.x, top: guide.at(-1)!.y }}
        />
        <div
          className={`lesson-actor ${companion.id} ${feeding ? 'feeding' : 'walking'}`}
          ref={actor}
          style={{
            offsetPath: `path('${polyline(guide)}')`,
            offsetRotate: '0deg',
            offsetAnchor: '50% 50%',
          }}
        >
          <img src={`/images/kids-learning/${companion.id}.svg`} alt={companion.name} />
          {companion.id !== 'bee' && companion.id !== 'child' && (
            <span className="actor-paws" aria-hidden="true" />
          )}
        </div>
        {feeding && (
          <span className="animation-love" aria-hidden="true">
            ♥
          </span>
        )}
      </div>
      <p className="animation-note">Con đã đưa {companion.name.toLowerCase()} tới nơi rồi!</p>
    </div>
  );
}
