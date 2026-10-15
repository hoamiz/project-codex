import { useRef, useState, type ReactNode } from 'react';
import { defaultRange, type NumberRange } from './lessons';
import { commitRange } from './range-core';

/** Ref là model commit đồng bộ: blur trước click Bắt đầu không được đọc range React của render cũ. */
export function RangeSettings({
  onStart,
  children,
}: {
  onStart: (range: NumberRange) => void;
  children?: ReactNode;
}) {
  const model = useRef({
    range: defaultRange,
    drafts: { start: '1', end: '5' },
    dirty: null as keyof NumberRange | null,
  });
  const [, render] = useState(0);
  function commit(field: keyof NumberRange) {
    const m = model.current;
    if (m.dirty !== field) return;
    m.range = commitRange(m.range, field, m.drafts[field]);
    m.drafts = { start: String(m.range.start), end: String(m.range.end) };
    m.dirty = null;
    render((n) => n + 1);
  }
  return (
    <form
      className="learning-settings"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (model.current.dirty) commit(model.current.dirty);
        onStart({ ...model.current.range });
      }}
    >
      <div className="learning-range">
        {(['start', 'end'] as const).map((field) => (
          <label key={field}>
            {field === 'start' ? 'Từ số' : 'Đến số'}
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="10"
              step="1"
              value={model.current.drafts[field]}
              onChange={(e) => {
                model.current.drafts[field] = e.target.value;
                model.current.dirty = field;
                render((n) => n + 1);
              }}
              onBlur={() => commit(field)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commit(field);
                }
              }}
            />
          </label>
        ))}
      </div>
      <div className="learning-presets" role="group" aria-label="Chọn nhanh khoảng số">
        {[3, 5, 10].map((end) => (
          <button
            type="button"
            key={end}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              model.current = {
                range: { start: 1, end },
                drafts: { start: '1', end: String(end) },
                dirty: null,
              };
              render((n) => n + 1);
            }}
          >
            1–{end}
          </button>
        ))}
      </div>
      {children}
      <button className="learning-button primary" type="submit">
        Bắt đầu <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
