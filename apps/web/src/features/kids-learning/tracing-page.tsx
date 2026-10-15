import { useEffect, useReducer, useRef, useState, type KeyboardEvent } from 'react';
import { DrawingBoard, useBoardWidth } from './drawing-board';
import { distance, polyline } from './drawing-core';
import { levels, type Point } from './lessons';
import { createTrace, gradeTrace, tracePoints } from './tracing-core';
import { initialTracing, tracingReducer } from './lesson-state';
import type { LessonProps } from './matching-page';
import { LessonAnimation } from './lesson-animation';

export function TracingPage({ level, blocked = false, onSpeak, onComplete }: LessonProps) {
  const [state, dispatch] = useReducer(tracingReducer, undefined, () =>
    initialTracing(createTrace(level)),
  );
  const [started, setStarted] = useReducer(() => true, false);
  const host = useRef<HTMLDivElement>(null);
  const width = useBoardWidth(host);
  const height = 240;
  const guide = tracePoints(state.round, width, height);
  const awarded = useRef<string | null>(null);
  const companion = state.round.companion;
  const locked = blocked || state.phase === 'animating' || state.phase === 'completed';
  const cursorRef = useRef<Point>({ x: 32, y: 120 });
  const [cursor, setCursor] = useState<Point>(cursorRef.current);
  const keyboardStroke = useRef<Point[] | null>(null);
  const keyboardUsed = useRef(false);
  const replay = useRef<HTMLButtonElement>(null);
  function moveCursor(point: Point) {
    cursorRef.current = point;
    setCursor(point);
  }
  useEffect(() => {
    if (keyboardStroke.current) {
      keyboardStroke.current = null;
      dispatch({ type: 'cancel' });
    }
    moveCursor({ x: 32, y: 120 });
  }, [width, state.round.id]);
  useEffect(() => {
    if (blocked && keyboardStroke.current) {
      keyboardStroke.current = null;
      dispatch({ type: 'cancel' });
    }
  }, [blocked]);
  useEffect(() => {
    if (state.phase === 'completed' && keyboardUsed.current) replay.current?.focus();
  }, [state.phase]);
  useEffect(() => {
    if (state.completedOnce && awarded.current !== state.round.id) {
      awarded.current = state.round.id;
      onComplete(state.round.id);
    }
  }, [state.completedOnce, state.round.id, onComplete]);
  function submit(points: Point[]) {
    keyboardStroke.current = null;
    const grade = gradeTrace(points, guide, state.round.level);
    dispatch({ type: 'submit', points, grade });
    onSpeak(grade.accepted ? 'success' : 'retry');
  }
  /** Bút bàn phím sinh cùng dãy tọa độ và qua cùng grader; Home chỉ đặt lại bút, không giải đường mẫu. */
  function keyboard(e: KeyboardEvent<SVGSVGElement>) {
    if (locked) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Home'].includes(e.key))
      e.preventDefault();
    else return;
    keyboardUsed.current = true;
    if (e.key === 'Home') {
      keyboardStroke.current = null;
      dispatch({ type: 'cancel' });
      moveCursor(guide[0]);
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') {
      if (keyboardStroke.current) {
        submit([...keyboardStroke.current]);
        return;
      }
      if (e.key === ' ' && distance(cursorRef.current, guide[0]) <= 22) {
        keyboardStroke.current = [cursorRef.current];
        dispatch({ type: 'start' });
      }
      return;
    }
    const p = cursorRef.current;
    const next = {
      x: Math.max(
        0,
        Math.min(width, p.x + (e.key === 'ArrowRight' ? 4 : e.key === 'ArrowLeft' ? -4 : 0)),
      ),
      y: Math.max(
        0,
        Math.min(height, p.y + (e.key === 'ArrowDown' ? 4 : e.key === 'ArrowUp' ? -4 : 0)),
      ),
    };
    if (keyboardStroke.current && keyboardStroke.current.length < 4096)
      keyboardStroke.current.push(next);
    moveCursor(next);
  }
  return (
    <section className="learning-lesson" aria-labelledby="tracing-title">
      <div className="learning-section-title">
        <div>
          <span className="learning-eyebrow">BÀI 02 · KHÉO TAY MỖI NGÀY</span>
          <h1 id="tracing-title">Đồ nét vui nhộn</h1>
          <p>Đi theo nét chấm, đưa bạn nhỏ đến nơi nhé.</p>
        </div>
        <span className="learning-step">{levels[state.round.level].label}</span>
      </div>
      {!started ? (
        <div className="learning-empty">
          <img src="/images/kids-learning/bee.svg" alt="" />
          <h2>Một chuyến đi nhỏ xinh</h2>
          <p>Giữ bút, đi theo nét chấm và khám phá điều bất ngờ.</p>
          <button
            className="learning-button primary"
            disabled={blocked}
            onClick={() => {
              const round = createTrace(level);
              dispatch({ type: 'new', round });
              setStarted();
              onSpeak(round.companion.id);
            }}
          >
            Bắt đầu →
          </button>
        </div>
      ) : (
        <>
          <div
            className="tracing-card"
            data-round={state.round.id}
            data-pattern={state.round.pattern}
            data-companion={companion.id}
            data-level={state.round.level}
            data-phase={state.phase}
          >
            {state.phase === 'animating' ? (
              <LessonAnimation
                round={state.round}
                width={width}
                sequence={state.sequence}
                onDone={() =>
                  dispatch({
                    type: 'animationDone',
                    roundId: state.round.id,
                    sequence: state.sequence,
                  })
                }
              />
            ) : (
              <>
                <div className="tracing-companions">
                  <div>
                    <img src={`/images/kids-learning/${companion.id}.svg`} alt={companion.name} />
                    <span>{companion.name}</span>
                  </div>
                  <p>Đến với {companion.target}</p>
                  <div>
                    <img
                      src={`/images/kids-learning/${companion.destination}.svg`}
                      alt={companion.target}
                    />
                    <span>{companion.target}</span>
                  </div>
                </div>
                <div ref={host} className="tracing-paper">
                  <DrawingBoard
                    width={width}
                    height={height}
                    label="Bảng đồ nét, Home về đầu, Space đặt bút, phím mũi tên vẽ, Enter nộp"
                    disabled={locked}
                    onKeyDown={keyboard}
                    onStart={(p) => {
                      if (distance(p, guide[0]) > 22) return false;
                      keyboardUsed.current = false;
                      keyboardStroke.current = null;
                      dispatch({ type: 'cancel' });
                      dispatch({ type: 'start' });
                      return true;
                    }}
                    onFinish={submit}
                    onCancel={() => dispatch({ type: 'cancel' })}
                  >
                    <path
                      className="tracing-guide"
                      d={polyline(guide)}
                      stroke="#9a947e"
                      strokeWidth={levels[state.round.level].stroke}
                      strokeDasharray="1 12"
                      fill="none"
                      strokeLinecap="round"
                    />
                    {state.points.length > 0 && (
                      <path
                        className={`tracing-attempt ${state.grade?.accepted ? 'correct' : 'wrong'}`}
                        d={polyline(state.points)}
                        fill="none"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {keyboardStroke.current && (
                      <path
                        d={polyline(keyboardStroke.current)}
                        fill="none"
                        stroke="#676cb5"
                        strokeWidth="5"
                        strokeLinecap="round"
                      />
                    )}
                    <circle
                      data-trace-start="true"
                      cx={guide[0].x}
                      cy={guide[0].y}
                      r="22"
                      fill="#d7e9db"
                      stroke="#48775d"
                      strokeWidth="2"
                    />
                    <circle
                      data-trace-end="true"
                      cx={guide.at(-1)!.x}
                      cy={guide.at(-1)!.y}
                      r="22"
                      fill="#ffedba"
                      stroke="#9c8039"
                      strokeWidth="2"
                    />
                    <text
                      x={guide[0].x}
                      y={guide[0].y + 5}
                      textAnchor="middle"
                      fill="#355d41"
                      fontSize="14"
                      fontWeight="900"
                    >
                      ●
                    </text>
                    <text
                      x={guide.at(-1)!.x}
                      y={guide.at(-1)!.y + 5}
                      textAnchor="middle"
                      fill="#6d552c"
                      fontSize="16"
                      fontWeight="900"
                    >
                      ✓
                    </text>
                    <circle
                      className="keyboard-pen"
                      cx={cursor.x}
                      cy={cursor.y}
                      r="5"
                      fill="#6e6baa"
                      stroke="white"
                      strokeWidth="2"
                      pointerEvents="none"
                    />
                  </DrawingBoard>
                </div>
                <div className="tracing-foot">
                  <span>BẮT ĐẦU →</span>
                  <span>← VỀ ĐÍCH</span>
                </div>
              </>
            )}
          </div>
          <details className="learning-pen-help">
            <summary>Dùng bàn phím để vẽ</summary>
            <p>
              Home: về chấm đầu. Space: đặt/nhấc bút. Phím mũi tên: di chuyển bút. Enter: nộp nét
              vẽ.
            </p>
          </details>
          <p className="learning-feedback" role="status">
            {state.phase === 'completed'
              ? 'Đã hoàn thành! Chuyến đi thật vui.'
              : state.grade?.reason || 'Giữ bút từ chấm xanh, đi sát nét chấm đến chấm vàng.'}
          </p>
          <div className="learning-actions">
            {state.phase === 'completed' && (
              <button
                className="learning-button"
                ref={replay}
                onClick={() => {
                  dispatch({ type: 'replay' });
                  moveCursor(guide[0]);
                }}
              >
                Vẽ lại
              </button>
            )}
            <button
              className="learning-button primary"
              disabled={blocked || state.phase === 'animating'}
              onClick={() => {
                const round = createTrace(level, Math.random, state.round);
                dispatch({ type: 'new', round });
                onSpeak(round.companion.id);
              }}
            >
              Bài tiếp →
            </button>
          </div>
        </>
      )}
    </section>
  );
}
