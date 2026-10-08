import { lazy, Suspense, useCallback, useRef, useState, type RefObject } from 'react';
import { Camera, RotateCcw, ZoomIn, ZoomOut, Move, Orbit, Grid2X2 } from 'lucide-react';
import { State } from '../../components/ui';
import type { Brick, BrickCatalog, BrickLayout } from './brick-core';
import type { CameraCommand } from './brick-scene';
const Scene = lazy(() => import('./brick-scene'));
const noop = () => {};
interface Props {
  layout: BrickLayout;
  catalog: BrickCatalog;
  selectedId?: string | null;
  readonly?: boolean;
  trashRef?: RefObject<HTMLButtonElement | null>;
  onSelect?: (id: string | null) => void;
  onMove?: (brick: Brick) => void;
  onDelete?: (id: string) => void;
  onTrashHover?: (hover: boolean) => void;
}
export function BrickViewport(props: Props) {
  const [renderer, setRenderer] = useState<'webgl' | '2d' | null>(null);
  const [flat, setFlat] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [mode, setMode] = useState<'edit' | 'orbit'>('edit');
  const [command, setCommand] = useState<CameraCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const sequence = useRef(0);
  const ready = useCallback((v: 'webgl' | '2d') => setRenderer(v), []);
  const image = useCallback((url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = 'brick-playground.png';
    link.click();
  }, []);
  const send = (type: CameraCommand['type']) => {
    setError(null);
    setCommand({ type, sequence: ++sequence.current });
  };
  return (
    <section
      className="brick-stage"
      aria-label="Sân lắp gạch"
      data-ready={!!renderer}
      data-renderer={renderer}
    >
      <div className="brick-stage-bar">
        <span>
          <i /> CHÂN ĐẾ 32 × 32 <small>{props.layout.bricks.length} / 150 GẠCH</small>
        </span>
        <div>
          <button
            aria-label="Thu nhỏ công trình"
            onClick={() => send('zoom-out')}
            disabled={renderer !== 'webgl'}
          >
            <ZoomOut size={16} />
          </button>
          <button
            aria-label="Phóng to công trình"
            onClick={() => send('zoom-in')}
            disabled={renderer !== 'webgl'}
          >
            <ZoomIn size={16} />
          </button>
          <button
            aria-label="Đặt lại góc nhìn"
            onClick={() => send('reset')}
            disabled={renderer !== 'webgl'}
          >
            <RotateCcw size={15} />
          </button>
          <button
            aria-label="Tải ảnh công trình"
            onClick={() => send('capture')}
            disabled={renderer !== 'webgl'}
          >
            <Camera size={16} />
          </button>
        </div>
      </div>
      <div
        className="brick-canvas"
        tabIndex={0}
        aria-label="Sân gạch; mũi tên di chuyển, R xoay, Delete xóa"
      >
        <Suspense fallback={<State loading />}>
          <Scene
            key={attempt}
            {...props}
            selectedId={props.selectedId || null}
            readonly={!!props.readonly}
            mode={mode}
            flat={flat}
            command={command}
            onSelect={props.onSelect || noop}
            onMove={props.onMove || noop}
            onDelete={props.onDelete || noop}
            onTrashHover={props.onTrashHover || noop}
            onReady={ready}
            onImage={image}
            onError={setError}
            onDragHint={setHint}
          />
        </Suspense>
      </div>
      <div className="brick-view-controls">
        {!props.readonly && (
          <button
            aria-pressed={mode === 'edit' && !flat}
            onClick={() => {
              setMode('edit');
              setFlat(false);
              setCommand(null);
              if (renderer === '2d') {
                setRenderer(null);
                setAttempt((a) => a + 1);
              }
            }}
          >
            <Move size={14} /> Lắp gạch
          </button>
        )}
        <button
          aria-pressed={mode === 'orbit' && !flat}
          onClick={() => {
            setMode('orbit');
            setFlat(false);
            setCommand(null);
            if (renderer === '2d') {
              setRenderer(null);
              setAttempt((a) => a + 1);
            }
          }}
        >
          <Orbit size={14} /> Xem 3D
        </button>
        <button aria-pressed={flat || renderer === '2d'} onClick={() => setFlat(true)}>
          <Grid2X2 size={14} /> Sơ đồ
        </button>
      </div>
      <p className="brick-stage-tip" role="status">
        {hint ||
          (renderer === '2d'
            ? 'Sơ đồ 2D · PNG cần chế độ 3D.'
            : mode === 'edit'
              ? 'Kéo để lắp · Cuộn để zoom · Chọn “Xem 3D” để xoay'
              : 'Kéo nền để xoay · Cuộn để zoom')}
      </p>
      {error && (
        <p className="brick-alert" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
