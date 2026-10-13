import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, BookOpen, Headphones, Volume2, X } from 'lucide-react';
import { alphabet, audioUrl, exampleParts, illustrationUrl, type Letter } from './alphabet-data';
import { createLetterPlayback, type PlaybackState } from './letter-playback';
import './alphabet.css';

const colors = [
  ['#fff0dd', '#9d4d19'],
  ['#e7f3ed', '#246b54'],
  ['#eeebfc', '#6940a0'],
  ['#fff1c9', '#80600c'],
  ['#e7f1fc', '#345fa1'],
  ['#ffe9e6', '#ac453b'],
];
const theme = (index: number) =>
  ({
    '--letter-bg': colors[index % colors.length][0],
    '--letter-ink': colors[index % colors.length][1],
  }) as CSSProperties;

function Example({ letter }: { letter: Letter }) {
  return exampleParts(letter).map(({ text, highlight }, i) =>
    highlight ? <mark key={i}>{text}</mark> : <span key={i}>{text}</span>,
  );
}

/** Dialog native khóa nền/focus; hoàn trả scroll và nút mở khi thẻ tự đóng hoặc được đóng bằng tay. */
function LetterDialog({
  letter,
  state,
  onClose,
  onRetry,
  trigger,
}: {
  letter: Letter;
  state: PlaybackState;
  onClose: () => void;
  onRetry: () => void;
  trigger: HTMLElement | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, [trigger]);
  const status = {
    idle: 'Chạm vào một chữ để nghe nhé!',
    loading: 'Đang chuẩn bị giọng đọc…',
    playing: 'Cùng nghe chữ và từ ví dụ nhé!',
    finished: 'Giỏi lắm! Thẻ sẽ đóng sau 3 giây.',
    error: 'Chưa phát được âm thanh. Bé thử lại nhé!',
  }[state];
  return (
    <dialog
      ref={ref}
      className="alphabet-modal"
      style={theme(alphabet.indexOf(letter))}
      aria-label={`Chữ ${letter.letter} — ${letter.example}`}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        // Giữ vòng Tab trong thẻ, kể cả khi dialog chỉ có duy nhất nút đóng.
        const controls =
          event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        const first = controls[0],
          last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <button className="alphabet-close" aria-label="Đóng thẻ" onClick={onClose}>
        <X size={23} />
      </button>
      <div className="alphabet-modal-tag">
        <Volume2 size={16} aria-hidden="true" /> BÉ CÙNG ĐỌC
      </div>
      <h2 className="alphabet-modal-letter" aria-label={`Chữ ${letter.letter}`}>
        {letter.letter.toLocaleUpperCase('vi')}
        <span>{letter.letter}</span>
      </h2>
      <img
        className="alphabet-modal-image"
        src={illustrationUrl(letter)}
        alt={`Minh họa ${letter.example}`}
      />
      <p className="alphabet-modal-example">
        <Example letter={letter} />
      </p>
      <div
        className={`alphabet-audio-state is-${state}`}
        role={state === 'error' ? 'alert' : 'status'}
      >
        <span className="alphabet-sound-bars" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span>{status}</span>
      </div>
      {state === 'error' && (
        <button className="alphabet-retry" onClick={onRetry}>
          <Volume2 size={18} /> Thử phát lại
        </button>
      )}
      {state === 'finished' && (
        <div className="alphabet-close-progress" aria-hidden="true">
          <span />
        </div>
      )}
    </dialog>
  );
}

export default function VietnameseAlphabet() {
  const [selected, setSelected] = useState<Letter | null>(null);
  const [state, setState] = useState<PlaybackState>('idle');
  const trigger = useRef<HTMLElement | null>(null);
  const playback = useMemo(
    () =>
      createLetterPlayback({
        createAudio: (url) => {
          const audio = new Audio(url);
          audio.preload = 'auto';
          return audio;
        },
        onState: setState,
        onFinished: () => setSelected(null),
      }),
    [],
  );
  function close() {
    playback.stop();
    setSelected(null);
  }
  useEffect(() => {
    // Không để giọng đọc/timer chạy khi trẻ chuyển tab hoặc rời project.
    const hidden = () => {
      if (document.hidden) {
        playback.stop();
        setSelected(null);
      }
    };
    document.addEventListener('visibilitychange', hidden);
    return () => {
      document.removeEventListener('visibilitychange', hidden);
      playback.stop();
    };
  }, [playback]);
  return (
    <div className="alphabet-page">
      <header className="alphabet-header">
        <Link to="/" className="alphabet-back">
          <ArrowLeft size={17} /> <span>Portfolio</span>
        </Link>
        <div className="alphabet-brand">
          <span aria-hidden="true">
            a<span>b</span>c
          </span>{' '}
          Bé vui học chữ
        </div>
        <span className="alphabet-header-note">
          <Headphones size={17} aria-hidden="true" /> Tiếng Việt
        </span>
      </header>
      <section className="alphabet-hero" aria-labelledby="alphabet-heading">
        <div className="alphabet-hero-copy">
          <p className="alphabet-eyebrow">
            <span /> MỘT THẾ GIỚI NHỎ CHO BÉ
          </p>
          <h1 id="alphabet-heading">
            Chữ nhỏ.
            <br />
            <span>Thế giới to!</span>
          </h1>
          <p className="alphabet-intro">
            Bé chạm vào một chữ nhé.
            <br />
            Cùng xem hình, nghe tiếng và làm quen với những người bạn mới!
          </p>
          <a className="alphabet-start" href="#alphabet-board">
            Cùng học nào <ArrowUpRight size={20} />
          </a>
          <div className="alphabet-hero-notes">
            <span>
              <BookOpen size={17} /> 29 chữ cái
            </span>
            <span>
              <Volume2 size={17} /> Giọng đọc tiếng Việt
            </span>
          </div>
        </div>
        <div className="alphabet-hero-art" aria-hidden="true">
          <div className="alphabet-art-dot dot-one" />
          <div className="alphabet-art-dot dot-two" />
          <span className="alphabet-spark spark-one">✦</span>
          <span className="alphabet-spark spark-two">✧</span>
          <div className="alphabet-mini-card mini-a">
            <span>Aa</span>
            <img src="/images/alphabet/a.svg" alt="" />
          </div>
          <div className="alphabet-mini-card mini-m">
            <span>Mm</span>
            <img src="/images/alphabet/m.svg" alt="" />
          </div>
          <div className="alphabet-mini-card mini-b">
            <span>Bb</span>
            <img src="/images/alphabet/b.svg" alt="" />
          </div>
          <span className="alphabet-art-label">
            <Volume2 size={17} /> Chạm là nghe!
          </span>
        </div>
      </section>
      <section
        className="alphabet-board"
        id="alphabet-board"
        aria-labelledby="alphabet-board-title"
      >
        <div className="alphabet-board-heading">
          <div>
            <p className="alphabet-eyebrow">NHỮNG NGƯỜI BẠN CỦA BÉ</p>
            <h2 id="alphabet-board-title">Bảng chữ cái tiếng Việt</h2>
          </div>
          <span className="alphabet-board-hint">
            <Volume2 size={17} aria-hidden="true" /> Chạm vào thẻ để nghe
          </span>
        </div>
        <div className="alphabet-grid">
          {alphabet.map((letter, i) => (
            <button
              className="alphabet-card"
              style={theme(i)}
              key={letter.id}
              aria-label={`Học chữ ${letter.letter}: ${letter.example}`}
              aria-haspopup="dialog"
              onClick={(event) => {
                trigger.current = event.currentTarget;
                setSelected(letter);
                playback.start(audioUrl(letter));
              }}
            >
              <span className="alphabet-card-top">
                <span className="alphabet-card-letter">
                  {letter.letter.toLocaleUpperCase('vi')}
                  <span>{letter.letter}</span>
                </span>
                <Volume2 size={16} aria-hidden="true" />
              </span>
              <img
                src={illustrationUrl(letter)}
                alt={`Minh họa ${letter.example}`}
                loading="lazy"
                width="160"
                height="140"
              />
              <span className="alphabet-card-example">
                <Example letter={letter} />
              </span>
            </button>
          ))}
        </div>
      </section>
      <footer className="alphabet-footer">
        <span className="alphabet-footer-flower" aria-hidden="true">
          ✿
        </span>
        <p>
          Mỗi ngày một chút.
          <br />
          <strong>Mỗi chữ một niềm vui.</strong>
        </p>
        <span>Ba mẹ cùng bé chỉ vào hình và đọc theo nhé!</span>
      </footer>
      {selected && (
        <LetterDialog
          letter={selected}
          state={state}
          onClose={close}
          onRetry={() => playback.start(audioUrl(selected))}
          trigger={trigger.current}
        />
      )}
    </div>
  );
}
