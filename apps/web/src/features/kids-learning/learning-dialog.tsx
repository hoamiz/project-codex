import { useEffect, useId, useRef, type ReactNode } from 'react';
/** Modal không tháo cây bài học; trap focus và hoàn trả đúng nút mở khi đóng. */
export function LearningDialog({
  title,
  children,
  onClose,
  returnFocus,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  returnFocus?: HTMLElement | null;
}) {
  const id = useId();
  const dialog = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = returnFocus || (document.activeElement as HTMLElement | null);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    close.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [returnFocus]);
  return (
    <div
      className="learning-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="learning-modal"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }
          if (e.key === 'Tab') {
            const controls = Array.from(
              dialog.current!.querySelectorAll<HTMLElement>(
                'button:not(:disabled),a[href],input,select,[tabindex="0"]',
              ),
            );
            const first = controls[0],
              last = controls.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="learning-modal-heading">
          <h2 id={id}>{title}</h2>
          <button className="learning-icon-button" ref={close} onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
