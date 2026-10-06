import {
  useEffect,
  useRef,
  useId,
  isValidElement,
  cloneElement,
  type ReactElement,
  type ReactNode,
  type ButtonHTMLAttributes,
} from 'react';
import { X, ArrowRight, LoaderCircle } from 'lucide-react';
export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' }) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function State({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading?: boolean;
  error?: unknown;
  empty?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className="state" role={error ? 'alert' : 'status'}>
      {loading ? (
        <>
          <LoaderCircle className="spin" />
          Đang tải dữ liệu…
        </>
      ) : error ? (
        <>
          <p>{error instanceof Error ? error.message : 'Không tải được dữ liệu.'}</p>
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              Thử lại
            </Button>
          )}
        </>
      ) : empty ? (
        <p>Chưa có dữ liệu phù hợp.</p>
      ) : null}
    </div>
  );
}
/** Gắn label/error bằng ID để tên truy cập của select không bị lẫn với các option. */
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string[];
  children: ReactNode;
}) {
  const id = useId();
  const control = isValidElement(children)
    ? cloneElement(
        children as ReactElement<{
          id?: string;
          'aria-labelledby'?: string;
          'aria-invalid'?: boolean;
          'aria-describedby'?: string;
        }>,
        {
          id,
          'aria-labelledby': `${id}-label`,
          'aria-invalid': !!error,
          'aria-describedby': error ? `${id}-error` : undefined,
        },
      )
    : children;
  return (
    <label className="field" htmlFor={id}>
      <span id={`${id}-label`}>{label}</span>
      {control}
      {error && (
        <small id={`${id}-error`} className="field-error">
          {error.join(' ')}
        </small>
      )}
    </label>
  );
}
/** Khóa focus trong modal và trả focus về nút mở để người dùng bàn phím không lạc khỏi luồng. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('button,input')?.focus();
    return () => {
      document.body.style.overflow = bodyOverflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Tab') {
            const nodes = ref.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled),input,select,textarea,a[href]',
            );
            if (!nodes?.length) return;
            const first = nodes[0],
              last = nodes[nodes.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <Button variant="ghost" aria-label="Đóng" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  return (
    <nav className="pagination" aria-label="Phân trang">
      <Button variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Trước
      </Button>
      <span>
        Trang {page} / {Math.max(1, totalPages)}
      </span>
      <Button variant="outline" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Sau <ArrowRight size={16} />
      </Button>
    </nav>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}
export const statuses: Record<string, string> = {
  available: 'Đang bán',
  reserved: 'Đã giữ chỗ',
  sold: 'Đã bán',
  archived: 'Đã lưu trữ',
  new: 'Mới',
  in_progress: 'Đang xử lý',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};
export const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
