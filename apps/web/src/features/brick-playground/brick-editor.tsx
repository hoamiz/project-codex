import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Undo2,
  Redo2,
  RotateCw,
  Copy,
  Save,
  ArrowUpRight,
  Layers,
  Check,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Button, Modal } from '../../components/ui';
import {
  atPosition,
  commitHistory,
  DRAFT_KEY,
  emptyBricks,
  freePosition,
  historyOf,
  layoutError,
  parseDraft,
  placementError,
  redo,
  settle,
  undo,
  type Brick,
  type BrickCatalog,
  type BrickKind,
  type BrickLayout,
} from './brick-core';
import { BrickViewport } from './brick-viewport';
export interface BrickSnapshot {
  id: string;
  title: string;
  layout: BrickLayout;
  createdAt: string;
}
function BrickArt({ width, depth, color }: { width: number; depth: number; color: string }) {
  return (
    <svg viewBox="0 0 90 65" aria-hidden="true">
      <path d="M12 28 43 12 79 28 48 46Z" fill={color} />
      <path d="M12 28 48 46 48 57 12 39Z" fill={color} style={{ filter: 'brightness(.75)' }} />
      <path d="M48 46 79 28 79 39 48 57Z" fill={color} style={{ filter: 'brightness(.6)' }} />
      {Array.from({ length: Math.min(width * depth, 8) }, (_, i) => (
        <ellipse
          key={i}
          cx={32 + (i % 2) * 19 - Math.floor(i / 2) * 5}
          cy={22 + (i % 2) * 8 + Math.floor(i / 2) * 4}
          rx="7"
          ry="4"
          fill={color}
          stroke="rgba(0,0,0,.22)"
          strokeWidth="1.2"
        />
      ))}
    </svg>
  );
}
/** Form áp dụng cả ba tọa độ cùng lúc để không từ chối trạng thái trung gian khi người dùng đặt lên tầng khác. */
function PositionForm({ brick, onApply }: { brick: Brick; onApply: (brick: Brick) => void }) {
  const [position, setPosition] = useState({
    x: String(brick.x),
    y: String(brick.y),
    z: String(brick.z),
  });
  useEffect(
    () => setPosition({ x: String(brick.x), y: String(brick.y), z: String(brick.z) }),
    [brick.id, brick.x, brick.y, brick.z],
  );
  return (
    <form
      className="brick-position"
      onSubmit={(event) => {
        event.preventDefault();
        onApply({ ...brick, x: Number(position.x), y: Number(position.y), z: Number(position.z) });
      }}
    >
      <div>
        {(['x', 'y', 'z'] as const).map((axis) => (
          <label key={axis}>
            {axis.toUpperCase()}
            <input
              aria-label={`Vị trí ${axis.toUpperCase()}`}
              required
              type="number"
              step="1"
              value={position[axis]}
              onChange={(event) => setPosition((p) => ({ ...p, [axis]: event.target.value }))}
            />
          </label>
        ))}
      </div>
      <button type="submit" className="brick-action">
        Áp dụng vị trí
      </button>
      <small>X/Z: ô nút · Y: đơn vị plate</small>
    </form>
  );
}
export function BrickEditor({ catalog }: { catalog: BrickCatalog }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [initial] = useState(() => {
    const copy = location.state?.brickCopy as unknown;
    if (copy && !layoutError(copy, catalog)) return { layout: copy as BrickLayout, warning: null };
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const parsed = parseDraft(raw, catalog);
      return {
        layout: parsed || emptyBricks(),
        warning: raw && !parsed ? 'Nháp cũ không hợp lệ. Đã mở chân đế trống.' : null,
      };
    } catch {
      return {
        layout: emptyBricks(),
        warning: 'Nháp chỉ giữ trong phiên; trình duyệt đang chặn lưu.',
      };
    }
  });
  const [history, setHistory] = useState(() => historyOf(initial.layout));
  const layout = history.present;
  const [titleInput, setTitleInput] = useState(initial.layout.title);
  useEffect(() => setTitleInput(layout.title), [layout.title]);
  const [color, setColor] = useState(catalog.colors[0].value);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = layout.bricks.find((b) => b.id === selectedId);
  const [notice, setNotice] = useState<string | null>(initial.warning);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [trashHover, setTrashHover] = useState(false);
  const trashRef = useRef<HTMLButtonElement>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mobile, setMobile] = useState(() => matchMedia('(max-width:600px)').matches);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<BrickSnapshot | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const saveAttempt = useRef<{ key: string; signature: string; layout: BrickLayout } | null>(null);
  const saving = useRef(false);
  useEffect(() => {
    const query = matchMedia('(max-width:600px)');
    const update = () => {
      setMobile(query.matches);
      setPanelOpen(false);
    };
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (location.state?.brickCopy) void navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);
  /** Chỉ layout đã commit mới được lưu; storage bị chặn/quota không ngăn chỉnh và lưu snapshot qua API. */
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(layout));
      setStorageWarning(null);
    } catch {
      setStorageWarning('Nháp chỉ giữ trong phiên; trình duyệt không lưu được.');
    }
  }, [layout]);
  /** Settle và validate toàn bộ trước commit; mọi khối bị hạ là một phần của cùng command Undo. */
  const commit = (next: BrickLayout) => {
    const settled = { ...next, bricks: settle(next.bricks, catalog) };
    const error = layoutError(settled, catalog);
    if (error) {
      setNotice(error);
      return false;
    }
    setNotice(null);
    setHistory((h) => commitHistory(h, settled));
    return true;
  };
  const select = (id: string | null) => setSelectedId(id);
  /** Gạch mới/nhân bản có ID mới, chỉ spawn vào ô trống; giới hạn không làm mất layout đang dựng. */
  const add = (kind: BrickKind, source?: Brick) => {
    const brick: Brick = source
      ? { ...source, id: crypto.randomUUID() }
      : { id: crypto.randomUUID(), kind, color, x: 0, y: 0, z: 0, rotation: 0 };
    const placed = freePosition(brick, layout.bricks, catalog);
    if (!placed) {
      setNotice(
        layout.bricks.length >= 150
          ? 'Đã đủ 150 gạch. Xóa một gạch để thêm mới.'
          : 'Chân đế không còn vị trí trống cho loại gạch này.',
      );
      return;
    }
    if (commit({ ...layout, bricks: [...layout.bricks, placed] })) {
      setSelectedId(placed.id);
      if (mobile) setPanelOpen(false);
    }
  };
  /** Candidate được kiểm tra trước settle; thả sai không ghi history hoặc đổi nháp. */
  const move = (candidate: Brick) => {
    const error = placementError(candidate, layout.bricks, catalog);
    if (error) {
      setNotice(error);
      return;
    }
    commit({
      ...layout,
      bricks: layout.bricks.map((b) => (b.id === candidate.id ? candidate : b)),
    });
  };
  /** Xóa một khối rồi settle phần còn lại qua cùng commit để Undo phục hồi cả tháp. */
  const remove = (id: string) => {
    if (commit({ ...layout, bricks: layout.bricks.filter((b) => b.id !== id) }))
      setSelectedId(null);
  };
  const rotate = () => {
    if (selected)
      move({ ...selected, rotation: ((selected.rotation + 90) % 360) as Brick['rotation'] });
  };
  const doUndo = () => {
    setHistory(undo);
    setNotice(null);
  };
  const doRedo = () => {
    setHistory(redo);
    setNotice(null);
  };
  /** Phím chỉ tác động sân gạch; không cướp thao tác nhập hoặc phím trong dialog. */
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]')) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) doRedo();
        else doUndo();
        return;
      }
      if (!selected) return;
      if (
        [
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
          'Delete',
          'Backspace',
          'r',
          'R',
        ].includes(event.key)
      ) {
        event.preventDefault();
        if (event.key === 'Delete' || event.key === 'Backspace') remove(selected.id);
        else if (event.key.toLowerCase() === 'r') rotate();
        else
          move(
            atPosition(
              selected,
              selected.x + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0),
              selected.z + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0),
              layout.bricks,
              catalog,
            ),
          );
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
  /** Giữ payload/key của lần gửi lỗi; chỉnh layout mới tạo key mới, retry sau mất response không nhân đôi DB. */
  const save = async () => {
    if (saving.current) return;
    const signature = JSON.stringify(layout);
    if (saveAttempt.current?.signature !== signature)
      saveAttempt.current = {
        key: crypto.randomUUID(),
        signature,
        layout: structuredClone(layout),
      };
    const attempt = saveAttempt.current;
    saving.current = true;
    setPending(true);
    setSaveError(null);
    try {
      const result = await api<{ data: BrickSnapshot }>('/bricks/designs', {
        method: 'POST',
        headers: { 'Idempotency-Key': attempt.key },
        body: JSON.stringify({ layout: attempt.layout }),
      });
      setSaved(result.data);
      setShareOpen(true);
      setCopied(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Chưa lưu được công trình.');
    } finally {
      saving.current = false;
      setPending(false);
    }
  };
  const shareUrl = saved ? `${locationOrigin()}/projects/brick-playground/view/${saved.id}` : '';
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
      setSaveError('Chưa sao chép được. Bạn có thể chọn liên kết và sao chép thủ công.');
    }
  };
  const panel = (
    <>
      <div className="brick-panel-title">
        <h2>Hộp gạch</h2>
        <span>10 LOẠI</span>
      </div>
      <p className="brick-help-text">Chọn màu, rồi chọn một viên gạch.</p>
      <div className="brick-swatches" aria-label="Màu gạch mới">
        {catalog.colors.map((c) => (
          <button
            key={c.value}
            style={{ background: c.value, color: c.value === '#1f2937' ? '#fff' : '#101820' }}
            aria-label={`Màu gạch mới: ${c.label}`}
            aria-pressed={color === c.value}
            onClick={() => setColor(c.value)}
          >
            {color === c.value ? '✓' : ''}
          </button>
        ))}
      </div>
      <div className="brick-catalog">
        {catalog.kinds.map((k) => (
          <button key={k.kind} aria-label={`Thêm ${k.label}`} onClick={() => add(k.kind)}>
            <BrickArt width={k.width} depth={k.depth} color={color} />
            <strong>{k.label}</strong>
            <small>
              {k.height === 3 ? 'GẠCH' : 'TẤM'}
              <Plus size={12} />
            </small>
          </button>
        ))}
      </div>
      {selected && (
        <section className="brick-inspector" aria-label="Thuộc tính gạch đang chọn">
          <div className="brick-panel-title">
            <h3>{catalog.kinds.find((k) => k.kind === selected.kind)!.label}</h3>
            <button aria-label="Bỏ chọn gạch" onClick={() => setSelectedId(null)}>
              <X size={14} />
            </button>
          </div>
          <div className="brick-object-actions">
            <button onClick={rotate}>
              <RotateCw size={13} /> Xoay 90°
            </button>
            <button onClick={() => add(selected.kind, selected)}>
              <Copy size={13} /> Nhân bản
            </button>
            <button aria-label="Xóa gạch đang chọn" onClick={() => remove(selected.id)}>
              <Trash2 size={14} />
            </button>
          </div>
          <p className="brick-help-text">
            Góc xoay {selected.rotation}° · Đáy cao {selected.y}
          </p>
          <PositionForm brick={selected} onApply={move} />
          <p className="brick-help-text">Màu viên gạch đang chọn</p>
          <div className="brick-swatches">
            {catalog.colors.map((c) => (
              <button
                key={c.value}
                aria-label={`Đổi màu gạch: ${c.label}`}
                aria-pressed={selected.color === c.value}
                style={{ background: c.value, color: c.value === '#1f2937' ? '#fff' : '#101820' }}
                onClick={() => move({ ...selected, color: c.value })}
              >
                {selected.color === c.value ? '✓' : ''}
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="brick-instances" aria-label="Danh sách gạch">
        <h3>
          Trong công trình <span>{layout.bricks.length}</span>
        </h3>
        {layout.bricks.length ? (
          layout.bricks.map((brick, i) => (
            <button
              key={brick.id}
              aria-label={`Chọn ${catalog.kinds.find((k) => k.kind === brick.kind)!.label} ${i + 1}`}
              aria-pressed={selectedId === brick.id}
              onClick={() => select(brick.id)}
              data-id={brick.id}
            >
              <i style={{ background: brick.color }} />
              <span>
                {catalog.kinds.find((k) => k.kind === brick.kind)!.label}
                <small>
                  {brick.x}, {brick.z} · cao {brick.y}
                </small>
              </span>
              <b>{String(i + 1).padStart(2, '0')}</b>
            </button>
          ))
        ) : (
          <p>Chân đế đang trống. Thêm viên gạch đầu tiên!</p>
        )}
      </section>
    </>
  );
  return (
    <>
      <div className="brick-toolbar">
        <label>
          Tên công trình
          <input
            aria-label="Tên công trình"
            value={titleInput}
            maxLength={80}
            onChange={(event) => {
              const title = event.target.value;
              setTitleInput(title);
              if (title.trim().length >= 2) commit({ ...layout, title: title.trim() });
            }}
            onBlur={() => {
              if (titleInput.trim().length < 2) {
                setTitleInput(layout.title);
                setNotice('Tên công trình cần từ 2 đến 80 ký tự.');
              }
            }}
          />
        </label>
        <div>
          <button aria-label="Hoàn tác" onClick={doUndo} disabled={!history.past.length}>
            <Undo2 size={16} />
          </button>
          <button aria-label="Làm lại" onClick={doRedo} disabled={!history.future.length}>
            <Redo2 size={16} />
          </button>
          <button onClick={() => setClearOpen(true)} disabled={!layout.bricks.length}>
            <Trash2 size={14} /> Làm trống
          </button>
          <button onClick={() => setHelpOpen(true)}>Hướng dẫn</button>
          <button
            className="brick-save"
            disabled={pending || titleInput.trim().length < 2 || !!layoutError(layout, catalog)}
            onClick={() => void save()}
          >
            <Save size={14} />
            {pending
              ? 'Đang lưu…'
              : saveError && saveAttempt.current?.signature === JSON.stringify(layout)
                ? 'Thử lưu lại'
                : 'Lưu & chia sẻ'}
          </button>
        </div>
      </div>
      <div className="brick-session-note">
        <span>
          <i />
          {storageWarning || 'Nháp tự lưu trên trình duyệt này'}
        </span>
        <span>Snapshot được chia sẻ công khai khi lưu.</span>
      </div>
      {notice && (
        <p className="brick-alert" role="alert">
          {notice}
        </p>
      )}
      {saveError && (
        <p className="brick-alert" role="alert">
          {saveError}
        </p>
      )}
      {mobile && (
        <button
          className="brick-mobile-toggle"
          aria-haspopup="dialog"
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen(true)}
        >
          <Layers size={16} /> Hộp gạch & thuộc tính <span>{layout.bricks.length}</span>
        </button>
      )}
      <div className="brick-workspace">
        {!mobile && (
          <aside className="brick-panel" aria-label="Danh mục gạch">
            {panel}
          </aside>
        )}
        <div className="brick-build-area">
          <BrickViewport
            layout={layout}
            catalog={catalog}
            selectedId={selected?.id}
            trashRef={trashRef}
            onSelect={select}
            onMove={move}
            onDelete={remove}
            onTrashHover={setTrashHover}
          />
          <button
            ref={trashRef}
            className={`brick-trash ${trashHover ? 'is-hover' : ''}`}
            aria-label="Giỏ rác; xóa gạch đang chọn hoặc kéo gạch vào đây"
            disabled={!selected && !trashHover}
            onClick={() => selected && remove(selected.id)}
          >
            <Trash2 size={23} />
            <span>{trashHover ? 'THẢ ĐỂ BỎ' : 'GIỎ RÁC'}</span>
          </button>
        </div>
      </div>
      {saved && (
        <p className="brick-saved-note">
          <Check size={13} /> Đã có bản lưu{' '}
          <Link to={`/projects/brick-playground/view/${saved.id}`}>
            Xem công trình <ArrowUpRight size={13} />
          </Link>
        </p>
      )}
      {mobile && panelOpen && (
        <Modal title="Hộp gạch & thuộc tính" onClose={() => setPanelOpen(false)}>
          <div className="brick-mobile-panel">{panel}</div>
        </Modal>
      )}
      {clearOpen && (
        <Modal title="Làm trống chân đế?" onClose={() => setClearOpen(false)}>
          <p>Gạch hiện tại sẽ được bỏ khỏi chân đế. Bạn có thể Hoàn tác để lấy lại.</p>
          <div className="form-actions">
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              Giữ công trình
            </Button>
            <Button
              onClick={() => {
                commit({ ...layout, bricks: [] });
                setSelectedId(null);
                setClearOpen(false);
              }}
            >
              Làm trống chân đế
            </Button>
          </div>
        </Modal>
      )}
      {helpOpen && (
        <Modal title="Cách lắp gạch" onClose={() => setHelpOpen(false)}>
          <div className="brick-help">
            <p>
              <strong>Thêm:</strong> chọn màu rồi click một loại gạch. Gạch mới xuất hiện ở ô trống
              trên đế.
            </p>
            <p>
              <strong>Lắp:</strong> kéo gạch đến vị trí, thả lên đế hoặc gạch khác. Xanh là hợp lệ;
              đỏ là vị trí không thể đặt.
            </p>
            <p>
              <strong>Bỏ:</strong> kéo vào giỏ rác hoặc chọn rồi nhấn Delete. Gạch mất chân đỡ sẽ hạ
              xuống; Undo khôi phục cả thao tác.
            </p>
            <p>
              <strong>Bàn phím:</strong> mũi tên dịch theo nút, R xoay, Ctrl/⌘+Z hoàn tác, thêm
              Shift để làm lại. Escape hủy kéo.
            </p>
            <p>
              <strong>Chia sẻ:</strong> lưu tạo snapshot công khai chỉ xem. Sửa tiếp rồi lưu tạo bản
              mới.
            </p>
          </div>
        </Modal>
      )}
      {shareOpen && saved && (
        <Modal title="Công trình đã được lưu" onClose={() => setShareOpen(false)}>
          <p>Liên kết mở bản lưu chỉ xem. Công trình hiện tại vẫn có thể chỉnh tiếp.</p>
          <label className="field">
            Liên kết chia sẻ
            <input
              aria-label="Liên kết chia sẻ"
              value={shareUrl}
              readOnly
              onFocus={(event) => event.target.select()}
            />
          </label>
          <div className="form-actions">
            <Button variant="outline" onClick={() => void copyLink()}>
              {copied ? 'Đã sao chép' : 'Sao chép liên kết'}
            </Button>
            <Link className="btn btn-primary" to={`/projects/brick-playground/view/${saved.id}`}>
              Mở bản chia sẻ <ArrowUpRight size={14} />
            </Link>
          </div>
        </Modal>
      )}
    </>
  );
}
function locationOrigin() {
  return window.location.origin;
}
