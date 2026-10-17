import { useEffect, useRef, useState } from 'react';
import { journeyPath, scaleStroke } from './journey-path';
import type { Point } from './lessons';
import { tracePoints, type TraceRound } from './tracing-core';
import { learningImage } from './learning-assets';

const travelDuration = 7200;
const arrivalDuration = 2400;
const reducedFadeIn = 220;

/**
 * Chậm theo nét đã vẽ, rồi hành động tại đích; timeline chỉ sống trong vòng/token hiện tại.
 * Giảm chuyển động: bỏ đoạn đi đường nhưng vẫn giữ cảnh đến nơi đủ arrivalDuration để bé kịp xem.
 */
export function LessonAnimation({
  round,
  width,
  points,
  drawnWidth,
  sequence,
  onDone,
}: {
  round: TraceRound;
  width: number;
  points: Point[];
  drawnWidth: number;
  sequence: number;
  onDone: () => void;
}) {
  const actor = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const savedTime = useRef(0);
  const savedToken = useRef('');
  const [paused, setPaused] = useState(false);
  const [feeding, setFeeding] = useState(false);
  const guide = tracePoints(round, width);
  const companion = round.companion;
  // Giữ lề neo khi đổi chiều rộng; chỉ hình học hiển thị đổi, kết quả chấm và nét gốc giữ nguyên.
  const path = journeyPath([guide[0], ...scaleStroke(points, drawnWidth, width), guide.at(-1)!]);
  useEffect(() => {
    const el = actor.current;
    if (!el) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = media.matches;
    const duration = reduced ? arrivalDuration : travelDuration + arrivalDuration;
    const token = `${round.id}:${sequence}`;
    if (savedToken.current !== token) savedTime.current = 0;
    savedToken.current = token;
    let alive = true,
      completed = false,
      frame = 0,
      watchdog = 0;
    let remaining = Math.max(1, duration - savedTime.current) + 3000,
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
              { offsetDistance: '100%', opacity: 0, offset: 0 },
              { offsetDistance: '100%', opacity: 1, offset: reducedFadeIn / duration },
              { offsetDistance: '100%', opacity: 1, offset: 1 },
            ]
          : [
              { offsetDistance: '0%', offset: 0, easing: 'cubic-bezier(0.2, 0, 0.8, 1)' },
              { offsetDistance: '100%', offset: travelDuration / duration },
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
      setPaused(document.hidden);
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
      // Bật giảm chuyển động giữa chừng: nhảy tới đích nhưng vẫn diễn đủ cảnh đến nơi.
      if (!reduced && media.matches && Number(animation.currentTime || 0) < travelDuration)
        animation.currentTime = travelDuration;
    };
    let previousFeeding: boolean | null = null;
    const tick = () => {
      if (!alive) return;
      const time = Number(animation.currentTime || 0);
      const arrived = reduced || time >= travelDuration;
      if (arrived !== previousFeeding) {
        previousFeeding = arrived;
        setFeeding(arrived);
      }
      frame = requestAnimationFrame(tick);
    };
    setPaused(document.hidden);
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
  }, [round.id, sequence, path]);
  return (
    <div
      className="lesson-animation"
      data-scene={companion.id}
      data-stage={feeding ? 'arrived' : 'traveling'}
      data-paused={paused}
      aria-label={`Hoạt cảnh ${companion.action}`}
    >
      <p className="animation-caption" role="status">
        {feeding
          ? companion.action
          : `Cùng ${companion.name.toLowerCase()} đến ${companion.target} nhé!`}
      </p>
      <div className="animation-landscape" style={{ height: 240 }}>
        <svg viewBox={`0 0 ${width} 240`} preserveAspectRatio="none" aria-hidden="true">
          <path
            className="animation-trail"
            d={path}
            fill="none"
            stroke="#72a47c"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
        <img
          className="animation-destination"
          src={learningImage(companion.destination)}
          alt={companion.target}
          style={{ left: guide.at(-1)!.x, top: guide.at(-1)!.y }}
        />
        <div
          className={`lesson-actor ${companion.id} ${companion.movement} arrival-${companion.arrival} ${feeding ? 'feeding' : 'walking'}`}
          ref={actor}
          style={{
            offsetPath: `path('${path}')`,
            offsetRotate: '0deg',
            offsetAnchor: '50% 50%',
          }}
        >
          <img src={learningImage(companion.id)} alt={companion.name} />
          {companion.movement === 'walk' && <span className="actor-paws" aria-hidden="true" />}
          {(companion.movement === 'drive' || companion.movement === 'cycle') && (
            <span className="actor-wheels" aria-hidden="true" />
          )}
        </div>
      </div>
      <p className="animation-note">
        {feeding
          ? `Con đã đưa ${companion.name.toLowerCase()} tới nơi rồi!`
          : 'Bạn đang đi theo đường con vừa vẽ.'}
      </p>
    </div>
  );
}
