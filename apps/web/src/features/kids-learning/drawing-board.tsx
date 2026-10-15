import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { clientPoint, distance, polyline } from './drawing-core';
import type { Point } from './lessons';

/** Resize chỉ cập nhật cách render, không sinh đề; nét đang kéo bị hủy để không ghép hai hệ tọa độ. */
export function useBoardWidth(ref: RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(320);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(1, el.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  });
  return width;
}
interface Props {
  width: number;
  height: number;
  label: string;
  disabled?: boolean;
  children: ReactNode;
  onStart: (p: Point) => boolean;
  onFinish: (points: Point[]) => void;
  onCancel?: () => void;
  onKeyDown?: (e: KeyboardEvent<SVGSVGElement>) => void;
}
/** Capture đúng một bút; cancel/outside/unmount không nộp nét và pointer phụ không can thiệp lần thử. */
export function DrawingBoard({
  width,
  height,
  label,
  disabled = false,
  children,
  onStart,
  onFinish,
  onCancel,
  onKeyDown,
}: Props) {
  const active = useRef<{ id: number; points: Point[] } | null>(null);
  const [preview, setPreview] = useState<Point[]>([]);
  const callbacks = useRef({ onStart, onFinish, onCancel });
  callbacks.current = { onStart, onFinish, onCancel };
  function cancel() {
    if (active.current) {
      active.current = null;
      setPreview([]);
      callbacks.current.onCancel?.();
    }
  }
  useEffect(() => {
    cancel();
  }, [width, height, disabled]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, []);
  useEffect(
    () => () => {
      active.current = null;
    },
    [],
  );
  return (
    <svg
      className="learning-drawing"
      role={onKeyDown ? 'application' : 'img'}
      aria-label={label}
      tabIndex={onKeyDown ? 0 : undefined}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ height }}
      onKeyDown={onKeyDown}
      onPointerDown={(e) => {
        if (disabled || active.current || e.button !== 0 || e.isPrimary === false) return;
        const p = clientPoint(
          e.clientX,
          e.clientY,
          e.currentTarget.getBoundingClientRect(),
          width,
          height,
        );
        if (!callbacks.current.onStart(p)) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        active.current = { id: e.pointerId, points: [p] };
        setPreview([p]);
      }}
      onPointerMove={(e) => {
        const stroke = active.current;
        if (!stroke || stroke.id !== e.pointerId) return;
        const p = clientPoint(
          e.clientX,
          e.clientY,
          e.currentTarget.getBoundingClientRect(),
          width,
          height,
        );
        if (stroke.points.length < 4096 && distance(stroke.points.at(-1)!, p) >= 1) {
          stroke.points.push(p);
          setPreview([...stroke.points]);
        }
      }}
      onPointerUp={(e) => {
        const stroke = active.current;
        if (!stroke || stroke.id !== e.pointerId) return;
        const p = clientPoint(
          e.clientX,
          e.clientY,
          e.currentTarget.getBoundingClientRect(),
          width,
          height,
        );
        stroke.points.push(p);
        active.current = null;
        setPreview([]);
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
        if (
          stroke.points.length >= 2 &&
          stroke.points.slice(1).some((p) => distance(p, stroke.points[0]) > 4)
        )
          callbacks.current.onFinish(stroke.points);
        else callbacks.current.onCancel?.();
      }}
      onPointerCancel={(e) => {
        if (active.current?.id === e.pointerId) cancel();
      }}
      onLostPointerCapture={(e) => {
        if (active.current?.id === e.pointerId) cancel();
      }}
    >
      {children}
      {preview.length > 0 && (
        <path
          data-testid="learning-live"
          d={polyline(preview)}
          fill="none"
          stroke="#676cb5"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      )}
    </svg>
  );
}
