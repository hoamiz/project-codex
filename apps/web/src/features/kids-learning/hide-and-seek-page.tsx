import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { LessonProps } from './matching-page';
import { createSeek, selectSeek, findSeek, type SeekState } from './discovery-core';
import { seekObject, seekThemes, type SeekThemeId, type SeekObjectId } from './discovery-lessons';
import { useVisibleDelay } from './use-visible-delay';

export function HideAndSeekPage({ blocked = false, onSpeak, onComplete }: LessonProps) {
  const [theme, setTheme] = useState<SeekThemeId | 'random'>('random');
  const [state, setState] = useState<SeekState | null>(null);
  const [hint, setHint] = useState<SeekObjectId | null>(null);
  const [feedback, setFeedback] = useState('');
  const awarded = useRef('');
  const complete = Boolean(state && state.found.length === state.placements.length);
  useVisibleDelay(Boolean(hint) && !blocked, 2400, `${state?.id}:${hint}`, () => setHint(null));
  useEffect(() => {
    if (!state) return;
    if (complete) {
      if (awarded.current !== state.id) {
        awarded.current = state.id;
        onComplete(state.id);
        onSpeak('complete');
      }
    } else onSpeak(`seek-${state.selected}`);
  }, [state?.id, state?.selected, complete, onSpeak, onComplete]);
  function start(nextTheme: SeekThemeId | 'random') {
    setState(createSeek(nextTheme, Math.random, state || undefined));
    setHint(null);
    setFeedback('');
  }
  return (
    <section className="learning-lesson" aria-labelledby="hide-seek-title">
      <div className="learning-section-title">
        <div>
          <span className="learning-eyebrow">BÀI 04 · NHÀ THÁM HIỂM NHÍ</span>
          <h1 id="hide-seek-title">Trốn tìm kỳ thú</h1>
          <p>Chọn một hình trong bảng, rồi tìm bạn ấy đang trốn trong tranh.</p>
        </div>
      </div>
      <fieldset disabled={blocked} className="learning-fieldset">
        <legend className="sr-only">Chọn chủ đề và tìm hình trong tranh</legend>
        {!state ? (
          <div className="learning-empty">
            <img src="/images/kids-learning/bird.svg" alt="" />
            <h2>Cùng khám phá những nơi thật vui!</h2>
            <p>Đại dương, sa mạc, rừng rậm, khủng long và phương tiện.</p>
            <div className="seek-setup">
              <label>
                Chủ đề
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as SeekThemeId | 'random')}
                >
                  <option value="random">Ngẫu nhiên</option>
                  {seekThemes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="learning-button primary"
                onClick={() => start(theme)}
              >
                Bắt đầu →
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="seek-heading">
              <div>
                <span className="learning-eyebrow">{state.theme.name}</span>
                <h2>
                  {complete
                    ? 'Tìm đủ các bạn rồi!'
                    : `Tìm ${seekObject(state.selected).name.toLowerCase()} nhé!`}
                </h2>
              </div>
              <span
                className="learning-step"
                aria-label={`${state.found.length} trên ${state.placements.length} hình đã tìm`}
              >
                {state.found.length}/{state.placements.length}
              </span>
              <button
                type="button"
                className="learning-button"
                disabled={complete}
                onClick={() => {
                  setHint(state.selected);
                  setFeedback('Nhìn vùng có vòng sáng trong tranh nhé.');
                }}
              >
                Gợi ý
              </button>
            </div>
            <div className="seek-targets" role="group" aria-label="Các hình cần tìm">
              {state.placements.map((item) => {
                const object = seekObject(item.id),
                  found = state.found.includes(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={state.selected === item.id && !complete ? 'selected' : ''}
                    aria-pressed={state.selected === item.id && !complete}
                    disabled={found}
                    aria-label={`${found ? 'Đã tìm' : 'Tìm'} ${object.name.toLowerCase()}`}
                    onClick={() => {
                      setState(selectSeek(state, item.id));
                      setHint(null);
                      setFeedback('');
                    }}
                  >
                    <img src={`/images/kids-learning/${object.asset}.svg`} alt="" />
                    <span>{object.name}</span>
                    {found && (
                      <span className="seek-check" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div
              className={`seek-board ${state.theme.id}`}
              data-round={state.id}
              data-theme={state.theme.id}
              role="group"
              aria-label={`Bức tranh ${state.theme.name.toLowerCase()}`}
              style={{ '--scene-cover': state.theme.cover } as CSSProperties}
            >
              <img
                className="seek-background"
                src={`/images/kids-learning/scene-${state.theme.id}.svg`}
                alt=""
              />
              {state.placements.map((item) => {
                const object = seekObject(item.id),
                  found = state.found.includes(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`seek-hidden-item ${found ? 'discovery-found' : ''} ${hint === item.id ? 'discovery-hint' : ''}`}
                    data-object={item.id}
                    data-found={found}
                    aria-label={`Trong tranh: ${object.name.toLowerCase()}`}
                    disabled={found || complete}
                    style={
                      {
                        left: `${item.x}%`,
                        top: `${item.y}%`,
                        '--item-tilt': `${item.tilt}deg`,
                      } as CSSProperties
                    }
                    onClick={() => {
                      const next = findSeek(state, item.id);
                      if (next === state) {
                        setFeedback(
                          `Mình đang tìm ${seekObject(state.selected).name.toLowerCase()} nhé. Con có thể chọn hình khác trong bảng.`,
                        );
                        return;
                      }
                      setState(next);
                      setHint(null);
                      setFeedback(`Tìm thấy ${object.name.toLowerCase()} rồi! Giỏi quá!`);
                    }}
                  >
                    <img src={`/images/kids-learning/${object.asset}.svg`} alt="" />
                    {!found && (
                      <svg
                        className="seek-cover"
                        aria-hidden="true"
                        viewBox="0 0 100 50"
                        preserveAspectRatio="none"
                      >
                        <path
                          fill="currentColor"
                          d={
                            state.theme.id === 'desert'
                              ? 'M0 50 5 25 25 13 52 15 69 6 96 28 100 50Z'
                              : state.theme.id === 'ocean'
                                ? 'M0 50Q15 40 9 5Q30 13 30 42Q35 18 50 9Q65 19 57 43Q73 18 93 15Q92 40 100 50Z'
                                : 'M0 50Q-5 20 24 24Q30-4 54 15Q80 0 90 27Q110 30 100 50Z'
                          }
                        />
                      </svg>
                    )}
                    {found && (
                      <span className="seek-sparkle" aria-hidden="true">
                        ✦
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="learning-feedback" role="status">
              {feedback || 'Các bạn đang nấp sau cây, đá và những góc nhỏ. Con nhìn kỹ nhé.'}
            </p>
            {complete && (
              <div className="discovery-complete" role="status">
                <strong>Chúc mừng nhà thám hiểm nhỏ! Con tìm đủ cả 5 hình rồi.</strong>
                <p>Một chuyến khám phá mới đang chờ con.</p>
                <button
                  type="button"
                  className="learning-button primary"
                  onClick={() => start('random')}
                >
                  Màn tiếp →
                </button>
              </div>
            )}
          </>
        )}
      </fieldset>
    </section>
  );
}
