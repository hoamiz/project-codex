import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { LessonProps } from './matching-page';
import { RangeSettings } from './range-settings';
import {
  createNumberSearch,
  findNumber,
  nextNumber,
  type NumberSearchState,
} from './discovery-core';
import { numberColors } from './discovery-lessons';
import { useVisibleDelay } from './use-visible-delay';

export function NumberSearchPage({ blocked = false, onSpeak, onComplete }: LessonProps) {
  const [state, setState] = useState<NumberSearchState | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const awarded = useRef('');
  useVisibleDelay(
    state?.phase === 'celebrating' && !blocked,
    4200,
    `${state?.round.id}:${state?.target}`,
    () => {
      const id = state!.round.id;
      setState((current) => current && nextNumber(current, id));
      setHint(null);
      setFeedback('');
    },
  );
  useVisibleDelay(Boolean(hint) && !blocked, 2400, `${state?.round.id}:${hint}`, () =>
    setHint(null),
  );
  useEffect(() => {
    if (!state) return;
    if (state.phase === 'completed') {
      if (awarded.current !== state.round.id) {
        awarded.current = state.round.id;
        onComplete(state.round.id);
        onSpeak('complete');
      }
    } else onSpeak(state.phase === 'celebrating' ? 'success' : `number-${state.target}`);
  }, [state?.round.id, state?.target, state?.phase, onSpeak, onComplete]);
  const remaining =
    state?.round.cards.filter(
      (card) => card.value === state.target && !state.found.includes(card.id),
    ) || [];
  return (
    <section className="learning-lesson" aria-labelledby="number-search-title">
      <div className="learning-section-title">
        <div>
          <span className="learning-eyebrow">BÀI 03 · ĐÔI MẮT TINH NHANH</span>
          <h1 id="number-search-title">Tìm số sắc màu</h1>
          <p>Tìm từ số nhỏ đến số lớn. Chạm đủ những số giống nhau nhé.</p>
        </div>
      </div>
      <fieldset disabled={blocked} className="learning-fieldset">
        <legend className="sr-only">Chọn khoảng số và tìm số</legend>
        <RangeSettings
          onStart={(range) => {
            setState(createNumberSearch(range));
            setHint(null);
            setFeedback('');
          }}
        />
        {!state ? (
          <div className="learning-empty">
            <span className="discovery-empty-number">1 2 3</span>
            <h2>Những con số đang trốn đâu nhỉ?</h2>
            <p>Mỗi số có ba bạn giống nhau. Chọn khoảng rồi bắt đầu nào!</p>
          </div>
        ) : (
          <>
            <div
              className={`number-search-prompt ${state.phase === 'celebrating' ? 'celebrate' : ''}`}
              role="status"
              data-target={state.target}
            >
              <span
                className="number-search-current"
                style={{ color: numberColors[state.target] }}
                key={`${state.round.id}:${state.target}`}
              >
                {state.target}
              </span>
              <div>
                <strong>
                  {state.phase === 'completed'
                    ? 'Con tìm đủ tất cả rồi!'
                    : state.phase === 'celebrating'
                      ? `Tìm đủ số ${state.target} rồi! Giỏi quá!`
                      : `Tìm tất cả số ${state.target} nhé!`}
                </strong>
                <p>
                  {state.phase === 'completed'
                    ? 'Một bức tranh số thật nhiều màu.'
                    : `Còn ${remaining.length} số ${state.target} cần tìm.`}
                </p>
              </div>
              <button
                type="button"
                className="learning-button"
                disabled={state.phase !== 'playing'}
                onClick={() => {
                  setHint(remaining[0]?.id || null);
                  setFeedback('Nhìn số có vòng sáng nhé.');
                }}
              >
                Gợi ý
              </button>
            </div>
            <div
              className="number-search-board"
              role="group"
              aria-label="Bảng số ngẫu nhiên"
              data-round={state.round.id}
              data-phase={state.phase}
            >
              {state.round.cards.map((card, index) => {
                const found = state.found.includes(card.id);
                return (
                  <button
                    type="button"
                    key={card.id}
                    className={`number-search-card ${found ? 'discovery-found' : ''} ${hint === card.id ? 'discovery-hint' : ''}`}
                    data-value={card.value}
                    data-found={found}
                    disabled={found || state.phase !== 'playing'}
                    aria-label={`${found ? 'Đã tìm' : 'Chọn'} số ${card.value}, ô ${index + 1}`}
                    style={
                      {
                        '--number-color': numberColors[card.value],
                        color: found ? numberColors[card.value] : '#20252b',
                        transform: `translate(${card.dx}px, ${card.dy}px) rotate(${card.tilt}deg)`,
                      } as CSSProperties
                    }
                    onClick={() => {
                      const next = findNumber(state, card.id);
                      if (next === state) {
                        setFeedback(`Mình đang tìm số ${state.target} nhé.`);
                        return;
                      }
                      setState(next);
                      setHint(null);
                      setFeedback(
                        next.phase === 'playing'
                          ? 'Đúng rồi! Còn những bạn giống thế nữa nhé.'
                          : 'Con tìm giỏi quá!',
                      );
                    }}
                  >
                    {card.value}
                    {found && (
                      <span className="number-found-mark" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="learning-feedback" role="status">
              {feedback || 'Các số đang màu đen. Tìm đúng, số sẽ khoác màu mới!'}
            </p>
            {state.phase === 'completed' && (
              <div className="discovery-complete" role="status">
                <strong>Chúc mừng! Con đã tìm hết {state.found.length} số!</strong>
                <p>Các số giống nhau có cùng một màu. Cùng thử một bảng mới nhé.</p>
                <button
                  type="button"
                  className="learning-button primary"
                  onClick={() => {
                    setState(createNumberSearch(state.round.range));
                    setHint(null);
                    setFeedback('');
                  }}
                >
                  Chơi lại →
                </button>
              </div>
            )}
          </>
        )}
      </fieldset>
    </section>
  );
}
