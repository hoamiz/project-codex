import { useState } from 'react';
/** ID hình trong một nhóm chỉ được đếm một lần; không phát sự kiện chọn đích nối số. */
export function CountHelper({ count, shape }: { count: number; shape: string }) {
  const [counted, setCounted] = useState<Set<number>>(() => new Set());
  return (
    <div className="count-helper">
      <div className="count-grid" aria-label={`Nhóm ${count} hình`}>
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            className={counted.has(i) ? 'counted' : ''}
            aria-label={`Đếm hình ${i + 1} trong nhóm ${count}`}
            aria-pressed={counted.has(i)}
            onClick={(e) => {
              e.stopPropagation();
              setCounted((previous) => (previous.has(i) ? previous : new Set([...previous, i])));
            }}
          >
            <img src={`/images/kids-learning/${shape}.svg`} alt="" />
            {counted.has(i) && <span aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>
      <button
        className="count-reset"
        aria-label={`Đếm lại nhóm ${count}`}
        onClick={(e) => {
          e.stopPropagation();
          setCounted(new Set());
        }}
      >
        <span aria-live="polite">
          {counted.size ? `Đã đếm ${counted.size} ↺` : 'Chạm hình để đếm'}
        </span>
      </button>
    </div>
  );
}
