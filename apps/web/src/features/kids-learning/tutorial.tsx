import { useEffect, useRef } from 'react';
import { LearningDialog } from './learning-dialog';
import { polyline } from './drawing-core';
import { tracePoints } from './tracing-core';
import { companions } from './lessons';
import { learningImage } from './learning-assets';
/** Ví dụ có dữ liệu riêng; timeline không bao giờ dispatch vào bài thật hoặc gọi callback thưởng. */
export function Tutorial({
  kind,
  onClose,
  returnFocus,
}: {
  kind: 'matching' | 'tracing';
  onClose: () => void;
  returnFocus?: HTMLElement | null;
}) {
  const hand = useRef<SVGGElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const reduced =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    typeof Element.prototype.animate !== 'function';
  const points =
    kind === 'matching'
      ? Array.from({ length: 61 }, (_, i) => ({ x: 32 + (i * 236) / 60, y: 80 }))
      : tracePoints(
          { id: 'tutorial', companion: companions[0], pattern: 'wave', variant: 0, level: 'easy' },
          300,
          160,
        );
  useEffect(() => {
    if (reduced) return;
    const animation = hand.current?.animate(
      points.map((p) => ({ transform: `translate(${p.x}px,${p.y}px)` })),
      { duration: 6000, fill: 'forwards' },
    );
    if (animation) animation.onfinish = () => close.current();
    const hidden = () => {
      if (document.hidden) close.current();
    };
    document.addEventListener('visibilitychange', hidden);
    return () => {
      if (animation) {
        animation.onfinish = null;
        animation.cancel();
      }
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [kind, reduced]);
  return (
    <LearningDialog title="Mình cùng xem cách chơi" onClose={onClose} returnFocus={returnFocus}>
      <p>
        {kind === 'matching'
          ? 'Chọn số, đếm hình, rồi kéo nối hai chấm.'
          : 'Đặt bút ở chấm xanh và đi theo nét chấm đến đích.'}
      </p>
      <div className="tutorial-sample">
        <svg
          viewBox="0 0 300 160"
          role="img"
          aria-label={
            kind === 'matching' ? 'Mẫu số ba nối tới ba hình' : 'Mẫu bàn tay đi theo đường sóng'
          }
        >
          {kind === 'tracing' && (
            <path
              d={polyline(points)}
              fill="none"
              stroke="#819977"
              strokeDasharray="1 9"
              strokeLinecap="round"
              strokeWidth="4"
            />
          )}
          <circle cx="32" cy="80" r="21" fill="#e0eddd" />
          <circle cx="268" cy="80" r="21" fill="#fff0c0" />
          <text x="32" y="86" textAnchor="middle" fontWeight="900" fontSize="20" fill="#396543">
            {kind === 'matching' ? '3' : '●'}
          </text>
          {kind === 'matching' ? (
            [0, 1, 2].map((i) => (
              <image
                key={i}
                href={learningImage('star')}
                x={246 + i * 12}
                y={52 + i * 10}
                width="24"
                height="24"
              />
            ))
          ) : (
            <image href={learningImage('flower')} x="251" y="61" width="36" height="42" />
          )}
          {!reduced && (
            <g ref={hand}>
              <path
                d="M0 0v-14q4-5 8 0V0l5-4q4 0 5 4v15q0 10-10 13H-1L-14 9q-2-5 3-6l11 8"
                fill="#f9d5ae"
                stroke="#8f6c4a"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>
      <ol className="tutorial-steps">
        <li>Đặt bút vào chấm</li>
        <li>{kind === 'matching' ? 'Nối với đúng số hình' : 'Giữ bút theo đường'}</li>
        <li>Nhấc bút, xem kết quả</li>
      </ol>
      <button className="learning-button primary" onClick={onClose}>
        {reduced ? 'Đã hiểu, cùng thử nào' : 'Bỏ qua, con muốn thử'}
      </button>
    </LearningDialog>
  );
}
