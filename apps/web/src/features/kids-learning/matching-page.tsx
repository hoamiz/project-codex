import { useEffect, useReducer, useRef, useState } from 'react';
import { DrawingBoard, useBoardWidth } from './drawing-board';
import { connectionPath, distance } from './drawing-core';
import { defaultRange, type Level, type Point } from './lessons';
import { checkConnection, createMatching } from './matching-core';
import { initialMatching, matchingReducer } from './lesson-state';
import { RangeSettings } from './range-settings';
import { CountHelper } from './count-helper';
export interface LessonProps {
  level: Level;
  blocked?: boolean;
  onSpeak: (id: string) => void;
  onComplete: (id: string) => void;
}

export function MatchingPage({ level, blocked = false, onSpeak, onComplete }: LessonProps) {
  const [state, dispatch] = useReducer(matchingReducer, undefined, () =>
    initialMatching(createMatching(defaultRange)),
  );
  const [started, setStarted] = useState(false);
  const center = useRef<HTMLDivElement>(null);
  const width = useBoardWidth(center);
  const source = useRef<number | null>(null);
  const awarded = useRef<string | null>(null);
  const correct = state.connections.filter((c) => c.correct);
  const complete = correct.length === state.round.numbers.length;
  const rowHeight = Math.max(150, Math.ceil(state.round.numbers.at(-1)! / 3) * 44 + 110);
  const height = state.round.numbers.length * rowHeight;
  const anchor = (index: number, left: boolean): Point => ({
    x: left ? 22 : width - 22,
    y: (index + 0.5) * rowHeight,
  });
  useEffect(() => {
    if (started && complete && awarded.current !== state.round.id) {
      awarded.current = state.round.id;
      onComplete(state.round.id);
    }
  }, [started, complete, state.round.id, onComplete]);
  function connect(n: number, target: number) {
    const result = checkConnection(state.round, state.connections, n, target);
    dispatch({ type: 'connect', source: n, target });
    if (result)
      onSpeak(
        result.correct
          ? correct.length + 1 === state.round.numbers.length
            ? 'complete'
            : 'success'
          : 'retry',
      );
  }
  function hit(p: Point, left: boolean) {
    return (left ? state.round.numbers : state.round.targets).find(
      (_, i) => distance(p, anchor(i, left)) <= 22,
    );
  }
  return (
    <section className="learning-lesson" aria-labelledby="matching-title" data-level={level}>
      <div className="learning-section-title">
        <div>
          <span className="learning-eyebrow">BÀI 01 · CÙNG TẬP ĐẾM</span>
          <h1 id="matching-title">Nối số với hình</h1>
          <p>Kéo từ chấm bên số đến nhóm hình tương ứng.</p>
        </div>
        <span
          className="learning-step"
          aria-label={`${correct.length} trên ${state.round.numbers.length} cặp đúng`}
        >
          {correct.length} / {state.round.numbers.length}
        </span>
      </div>
      <fieldset disabled={blocked} className="learning-fieldset">
        <legend className="sr-only">Chọn khoảng số và làm bài nối</legend>
        <RangeSettings
          onStart={(range) => {
            dispatch({ type: 'reset', round: createMatching(range) });
            setStarted(true);
            source.current = null;
            onSpeak('matching');
          }}
        />
        {!started ? (
          <div className="learning-empty">
            <img src="/images/kids-learning/star.svg" alt="" />
            <h2>Những con số đang đợi con!</h2>
            <p>Chọn khoảng số, rồi bấm Bắt đầu nhé.</p>
          </div>
        ) : (
          <>
            <div className="matching-headings" aria-hidden="true">
              <span>CON SỐ</span>
              <span>CÙNG NỐI NÀO</span>
              <span>BAO NHIÊU HÌNH?</span>
            </div>
            <div className="matching-board" data-round={state.round.id}>
              <div className="matching-numbers">
                {state.round.numbers.map((n) => (
                  <div key={n} style={{ height: rowHeight }}>
                    <button
                      className={`matching-number ${state.active === n ? 'selected' : ''} ${correct.some((c) => c.source === n) ? 'matched' : ''}`}
                      aria-label={`Chọn số ${n}`}
                      aria-pressed={state.active === n}
                      disabled={correct.some((c) => c.source === n)}
                      onClick={() => dispatch({ type: 'begin', source: n })}
                    >
                      {n}
                      {correct.some((c) => c.source === n) && (
                        <span className="matching-tick" aria-label="Đã đúng">
                          ✓
                        </span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
              <div ref={center} className="matching-paper">
                <DrawingBoard
                  width={width}
                  height={height}
                  label="Bảng trắng nối số"
                  disabled={blocked || complete}
                  onStart={(p) => {
                    const n = hit(p, true);
                    if (n === undefined || correct.some((c) => c.source === n)) return false;
                    source.current = n;
                    dispatch({ type: 'begin', source: n });
                    return true;
                  }}
                  onFinish={(points) => {
                    const n = source.current;
                    source.current = null;
                    const target = hit(points.at(-1)!, false);
                    if (n !== null && target !== undefined) connect(n, target);
                    else dispatch({ type: 'cancel' });
                  }}
                  onCancel={() => {
                    source.current = null;
                    dispatch({ type: 'cancel' });
                  }}
                >
                  {state.connections.map((c) => (
                    <path
                      key={c.source}
                      className={`matching-connection ${c.correct ? 'correct' : 'wrong'}`}
                      data-source-id={c.source}
                      data-target-id={c.target}
                      d={connectionPath(
                        anchor(state.round.numbers.indexOf(c.source), true),
                        anchor(state.round.targets.indexOf(c.target), false),
                      )}
                      fill="none"
                      strokeWidth="5"
                      strokeLinecap="round"
                      pointerEvents="none"
                    />
                  ))}
                  {state.round.numbers.map((n, i) => (
                    <circle
                      key={`s${n}`}
                      data-source={n}
                      cx="22"
                      cy={anchor(i, true).y}
                      r="19"
                      fill={correct.some((c) => c.source === n) ? '#d2eade' : '#fff8de'}
                      stroke="#ad934c"
                      strokeWidth="2"
                    />
                  ))}
                  {state.round.targets.map((n, i) => (
                    <circle
                      key={`t${n}`}
                      data-target={n}
                      cx={width - 22}
                      cy={anchor(i, false).y}
                      r="19"
                      fill={correct.some((c) => c.target === n) ? '#d2eade' : '#fff8de'}
                      stroke="#ad934c"
                      strokeWidth="2"
                    />
                  ))}
                </DrawingBoard>
              </div>
              <div className="matching-targets">
                {state.round.targets.map((n) => (
                  <div
                    className={`matching-group ${correct.some((c) => c.target === n) ? 'matched' : ''}`}
                    key={n}
                    style={{ height: rowHeight }}
                    data-count={n}
                  >
                    <CountHelper
                      key={`${state.round.id}-${n}`}
                      count={n}
                      shape={state.round.shape}
                    />
                    <button
                      className="matching-target-button"
                      aria-label={`Nối tới nhóm ${n} hình`}
                      disabled={correct.some((c) => c.target === n)}
                      onClick={() => {
                        if (state.active !== null) connect(state.active, n);
                      }}
                    >
                      {correct.some((c) => c.target === n) ? '✓ Đúng rồi' : '← Nối ở đây'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <p
              className={`learning-feedback ${complete || state.message.startsWith('Đúng rồi') ? 'celebrate' : ''}`}
              role="status"
              key={state.revision}
            >
              {state.message}
            </p>
            {complete && (
              <button
                className="learning-button primary"
                onClick={() => {
                  dispatch({
                    type: 'reset',
                    round: createMatching({
                      start: state.round.numbers[0],
                      end: state.round.numbers.at(-1)!,
                    }),
                  });
                  onSpeak('matching');
                }}
              >
                Bài mới →
              </button>
            )}
          </>
        )}
      </fieldset>
    </section>
  );
}
