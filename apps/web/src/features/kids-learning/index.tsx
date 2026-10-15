import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { MatchingPage } from './matching-page';
import { TracingPage } from './tracing-page';
import { basePath, type Level } from './lessons';
import { Tutorial } from './tutorial';
import { useLearningAudio } from './learning-audio';
import { useRewards } from './rewards-core';
import { Collection } from './collection';
import { stickerNames } from './rewards-core';
import './learning.css';

function LessonMenu() {
  return (
    <div className="learning-home">
      <section className="learning-hero">
        <div>
          <span className="learning-eyebrow">MỖI NÉT VẼ · MỘT KHÁM PHÁ</span>
          <h1>
            Chơi một chút.
            <br />
            <span>Học thêm điều hay.</span>
          </h1>
          <p>
            Đếm những ngôi sao, đi theo nét chấm.
            <br />
            Mình cùng học bằng những điều thật nhỏ nhé!
          </p>
          <div className="learning-chips">
            <span>Vừa chơi, vừa học</span>
            <span>Thử lại cũng thật vui</span>
          </div>
        </div>
        <div className="learning-hero-art" aria-hidden="true">
          <span className="learning-orbit" />
          <img className="hero-star" src="/images/kids-learning/star.svg" alt="" />
          <img className="hero-bee" src="/images/kids-learning/bee.svg" alt="" />
          <span className="hero-three">3</span>
          <span className="hero-squiggle">~</span>
        </div>
      </section>
      <section className="learning-menu" aria-labelledby="learning-menu-title">
        <div className="learning-menu-heading">
          <h2 id="learning-menu-title">Hôm nay, con muốn chơi gì?</h2>
          <span>CHỌN MỘT BÀI NHÉ ↓</span>
        </div>
        <div className="learning-cards">
          <Link className="learning-menu-card matching" to={`${basePath}/matching`}>
            <div className="learning-card-top">
              <span>BÀI 01</span>
              <ArrowUpRight size={22} />
            </div>
            <div className="learning-card-art">
              <img src="/images/kids-learning.svg" alt="Số ba nối tới ba ngôi sao" />
            </div>
            <div className="learning-card-copy">
              <h3>Nối số với hình</h3>
              <p>Đếm thật khéo, nối thật vui.</p>
              <span className="learning-card-cta">
                Cùng tập đếm <span aria-hidden="true">→</span>
              </span>
            </div>
          </Link>
          <Link className="learning-menu-card tracing" to={`${basePath}/tracing`}>
            <div className="learning-card-top">
              <span>BÀI 02</span>
              <ArrowUpRight size={22} />
            </div>
            <div className="learning-card-art">
              <svg viewBox="0 0 500 220" aria-hidden="true">
                <path
                  d="M60 130C140 15 190 210 260 110S350 30 440 100"
                  fill="none"
                  stroke="#84aa88"
                  strokeWidth="5"
                  strokeDasharray="1 12"
                  strokeLinecap="round"
                />
                <image href="/images/kids-learning/bee.svg" x="20" y="50" width="90" height="90" />
                <image
                  href="/images/kids-learning/flower.svg"
                  x="398"
                  y="48"
                  width="80"
                  height="100"
                />
              </svg>
            </div>
            <div className="learning-card-copy">
              <h3>Đồ nét vui nhộn</h3>
              <p>Một nét nhỏ, một chuyến đi.</p>
              <span className="learning-card-cta">
                Cùng khéo tay <span aria-hidden="true">→</span>
              </span>
            </div>
          </Link>
        </div>
      </section>
      <div className="learning-home-note">
        <Sparkles size={20} />
        <p>Không cần làm nhanh. Cứ thử theo cách của con!</p>
      </div>
    </div>
  );
}

export default function KidsLearning() {
  const [level, setLevel] = useState<Level>('easy');
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, '');
  const home = path === basePath;
  const tracing = path === basePath + '/tracing';
  const [tutorial, setTutorial] = useState(false);
  const tutorialTrigger = useRef<HTMLButtonElement>(null);
  const audio = useLearningAudio();
  const rewards = useRewards();
  const [collection, setCollection] = useState(false);
  const collectionTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    audio.stop();
    setTutorial(false);
    setCollection(false);
  }, [location.pathname, audio.stop]);
  const props = {
    level,
    blocked: tutorial || collection,
    onSpeak: audio.speak,
    onComplete: rewards.award,
  };
  return (
    <div className="learning-app">
      <div inert={tutorial || collection}>
        <header className="learning-header">
          <Link className="learning-back" to="/">
            <ArrowLeft size={14} /> Portfolio
          </Link>
          <Link className="learning-brand" to={basePath}>
            <img src="/images/kids-learning/star.svg" alt="" />
            <span>
              Bé vui <strong>học tập</strong>
              <small>GÓC KHÁM PHÁ NHỎ XINH</small>
            </span>
          </Link>
          <div className="learning-header-controls">
            <button
              className="learning-collection-trigger"
              ref={collectionTrigger}
              onClick={() => {
                audio.stop();
                setCollection(true);
              }}
              aria-label={`Bộ sưu tập ${rewards.ids.length} trên 12 sticker`}
            >
              <Sparkles size={16} />
              <span>{rewards.ids.length}/12</span>
            </button>
            <label className="learning-level">
              Độ khó
              <select
                value={level}
                title="Áp dụng khi tạo bài mới"
                onChange={(e) => setLevel(e.target.value as Level)}
              >
                <option value="easy">Dễ</option>
                <option value="medium">Vừa</option>
              </select>
            </label>
            <button
              className="learning-icon-button"
              aria-label={audio.enabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
              aria-pressed={audio.enabled}
              onClick={audio.toggle}
            >
              {audio.enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
        </header>
        {!home && (
          <nav className="learning-tabs" aria-label="Chọn bài học">
            <Link to={basePath}>← Chọn bài</Link>
            <NavLink to={`${basePath}/matching`}>Nối số</NavLink>
            <NavLink to={`${basePath}/tracing`}>Đồ nét</NavLink>
          </nav>
        )}
        {!home && (
          <div className="learning-tools">
            <button
              className="learning-button"
              ref={tutorialTrigger}
              onClick={() => {
                audio.speak(tracing ? 'tracing' : 'matching');
                setTutorial(true);
              }}
            >
              Xem cách chơi
            </button>
            <button
              className="learning-button"
              onClick={() => audio.speak(tracing ? 'tracing' : 'matching')}
            >
              Nghe hướng dẫn
            </button>
          </div>
        )}
        {audio.error && (
          <div className="learning-audio-error" role="status">
            {audio.error}
            <button className="learning-button" onClick={audio.retry}>
              Nghe lại
            </button>
          </div>
        )}
        {rewards.recent && (
          <div className="learning-reward" role="status">
            <img src={`/images/kids-learning/${rewards.recent}.svg`} alt="" />
            <span>Con đã có thêm bạn {stickerNames[rewards.recent].toLowerCase()}!</span>
            <button className="learning-button" onClick={() => setCollection(true)}>
              Xem sticker
            </button>
          </div>
        )}
        <Routes>
          <Route index element={<LessonMenu />} />
          <Route path="matching" element={<MatchingPage {...props} />} />
          <Route path="tracing" element={<TracingPage {...props} />} />
          <Route
            path="*"
            element={
              <div className="learning-empty">
                <h1>Chọn một chuyến đi khác nhé</h1>
                <Link to={basePath}>Về chọn bài</Link>
              </div>
            }
          />
        </Routes>
        <footer className="learning-footer">
          <span>MỖI NGÀY MỘT CHÚT HAY</span>
          <span>♥ Dành cho những bàn tay nhỏ</span>
        </footer>
      </div>
      {tutorial && (
        <Tutorial
          kind={tracing ? 'tracing' : 'matching'}
          onClose={() => {
            audio.stop();
            setTutorial(false);
          }}
          returnFocus={tutorialTrigger.current}
        />
      )}
      {collection && (
        <Collection
          ids={rewards.ids}
          onClose={() => setCollection(false)}
          returnFocus={collectionTrigger.current}
          sessionOnly={rewards.sessionOnly}
        />
      )}
    </div>
  );
}
