import { useCallback, useEffect, useReducer, useRef, useState, type KeyboardEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Armchair,
  BedDouble,
  Check,
  CheckCheck,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Grid2X2,
  HelpCircle,
  LampFloor,
  Layers,
  Library,
  LoaderCircle,
  Maximize2,
  Moon,
  MousePointer2,
  Move,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  Sprout,
  Sun,
  Table2,
  Trash2,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Button, Modal, State } from '../../components/ui';
import RoomScene, { type CameraCommand } from './room-scene';
import {
  DRAFT_KEY,
  challengeComplete,
  findPlacement,
  historyReducer,
  isRoomLayout,
  loadDraft,
  updateItem,
  type History,
  type ItemKind,
  type RoomCatalog,
  type RoomItem,
  type RoomLayout,
  type RoomSnapshot,
} from './room-core';
import './room.css';

const icons = {
  bed: BedDouble,
  desk: Table2,
  chair: Armchair,
  shelf: Library,
  lamp: LampFloor,
  plant: Sprout,
};
const colors = ['#a6b69d', '#ad9fc1', '#c79c76', '#d5a69b', '#e5c896', '#c8d5d8'];

function StudioHeading({
  children,
  readonly = false,
}: {
  children?: React.ReactNode;
  readonly?: boolean;
}) {
  return (
    <header className="room-heading">
      <div>
        <div className="eyebrow">
          <span className="room-brand-mark">
            <Layers size={15} />
          </span>{' '}
          PROJECT 04 · KHÔNG GIAN CỦA BẠN
        </div>
        <h1>
          Room Studio <span>3D</span>
        </h1>
        <p>
          {readonly
            ? 'Một không gian được chia sẻ. Một ý tưởng để khám phá.'
            : 'Một căn phòng nhỏ. Một chút sáng tạo. Một góc của riêng bạn.'}
        </p>
      </div>
      <div className="room-heading-actions">{children}</div>
    </header>
  );
}

function Viewport({
  layout,
  catalog,
  selectedId = null,
  onSelect = () => {},
  onMove = () => {},
  readonly = false,
}: {
  layout: RoomLayout;
  catalog: RoomCatalog;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, z: number) => void;
  readonly?: boolean;
}) {
  const [mode, setMode] = useState<'edit' | 'orbit'>(readonly ? 'orbit' : 'edit');
  const [flat, setFlat] = useState(false);
  const [renderer, setRenderer] = useState<'webgl' | '2d' | null>(null);
  const [command, setCommand] = useState<CameraCommand | null>(null);
  const ready = useCallback((value: 'webgl' | '2d') => setRenderer(value), []);
  const image = useCallback((url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = 'room-studio.png';
    link.click();
  }, []);
  const camera = (type: CameraCommand['type']) =>
    setCommand((previous) => ({ type, sequence: (previous?.sequence || 0) + 1 }));
  return (
    <section
      className="room-stage"
      data-renderer={renderer || 'loading'}
      data-ready={!!renderer}
      aria-label="Không gian thiết kế"
    >
      <div className="room-stage-toolbar">
        <span>
          <span className="room-live-dot" /> {readonly ? 'Không gian chia sẻ' : 'Phòng của tôi'}{' '}
          <small>{layout.items.length} món đồ</small>
        </span>
        <Button
          variant="ghost"
          aria-pressed={flat}
          onClick={() => {
            setFlat(!flat);
            setRenderer(null);
          }}
        >
          <Grid2X2 size={15} />
          {flat ? 'Xem 3D' : 'Sơ đồ'}
        </Button>
      </div>
      <div
        className="room-canvas"
        tabIndex={0}
        aria-label="Vùng xem phòng; chọn món đồ từ danh sách để sửa bằng bàn phím."
      >
        <RoomScene
          layout={layout}
          catalog={catalog}
          selectedId={selectedId}
          readonly={readonly}
          mode={mode}
          flat={flat}
          command={command}
          onSelect={onSelect}
          onMove={onMove}
          onReady={ready}
          onImage={image}
        />
        {!renderer && (
          <div className="room-render-loading" role="status">
            <LoaderCircle className="spin" size={22} />
            Đang dựng không gian…
          </div>
        )}
        {renderer === 'webgl' && (
          <div className="room-camera-actions">
            <Button variant="ghost" aria-label="Phóng to phòng" onClick={() => camera('zoom-in')}>
              <ZoomIn size={18} />
            </Button>
            <Button variant="ghost" aria-label="Thu nhỏ phòng" onClick={() => camera('zoom-out')}>
              <ZoomOut size={18} />
            </Button>
            <Button variant="ghost" aria-label="Đặt lại góc nhìn" onClick={() => camera('reset')}>
              <Maximize2 size={18} />
            </Button>
            <Button
              variant="ghost"
              aria-label="Tải ảnh căn phòng"
              onClick={() => camera('capture')}
            >
              <Download size={18} />
            </Button>
          </div>
        )}
      </div>
      <div className="room-stage-bottom">
        {!readonly && renderer === 'webgl' ? (
          <div className="room-mode-switch">
            <button aria-pressed={mode === 'edit'} onClick={() => setMode('edit')}>
              <MousePointer2 size={14} />
              Đặt đồ
            </button>
            <button aria-pressed={mode === 'orbit'} onClick={() => setMode('orbit')}>
              <Eye size={14} />
              Xem phòng
            </button>
          </div>
        ) : (
          <span className="room-render-label">
            {renderer === '2d' ? 'Sơ đồ 2D' : 'Xoay hoặc zoom để khám phá'}
          </span>
        )}
        <span>
          {renderer === 'webgl' && !readonly
            ? mode === 'edit'
              ? 'Kéo đồ để sắp xếp'
              : 'Giữ chuột để xoay góc nhìn'
            : 'Không gian 6 × 5 m'}
          <small>Ô lưới 0,25 m</small>
        </span>
      </div>
    </section>
  );
}

function RoomEditor({ catalog }: { catalog: RoomCatalog }) {
  const location = useLocation();
  const navigate = useNavigate();
  const imported: unknown = (location.state as { roomCopy?: unknown } | null)?.roomCopy;
  const [history, dispatch] = useReducer(historyReducer, null, (): History => ({
    past: [],
    present: isRoomLayout(imported, catalog) ? structuredClone(imported) : loadDraft(catalog),
    future: [],
  }));
  const layout = history.present;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = layout.items.find((item) => item.id === selectedId);
  const [mobilePanel, setMobilePanel] = useState<'catalog' | 'inspector'>('catalog');
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const [draftSaved, setDraftSaved] = useState(true);
  const [title, setTitle] = useState(layout.title);
  const [titleError, setTitleError] = useState('');
  const [reset, setReset] = useState<'empty' | 'starter' | null>(null);
  const [help, setHelp] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState<RoomSnapshot | null>(null);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const shareInput = useRef<HTMLInputElement>(null);
  const commit = (next: RoomLayout) => dispatch({ type: 'commit', layout: next });
  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) setMobilePanel('inspector');
  }, []);
  useEffect(() => setTitle(layout.title), [layout.title]);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(layout));
      setDraftSaved(true);
    } catch {
      setDraftSaved(false);
    }
  }, [layout]);
  // Chỉ dùng state copy một lần; reload tiếp theo phải khôi phục bản nháp đã chỉnh, không quay lại snapshot ban đầu.
  useEffect(() => {
    if (imported) navigate(location.pathname, { replace: true, state: null });
  }, [imported, location.pathname, navigate]);
  const editItem = useCallback(
    (id: string, patch: Partial<Pick<RoomItem, 'x' | 'z' | 'rotation' | 'color'>>) => {
      const result = updateItem(layout, id, patch, catalog);
      if (result.error) setNotice({ error: true, text: result.error });
      else {
        dispatch({ type: 'commit', layout: result.layout });
        setNotice(null);
      }
    },
    [layout, catalog],
  );
  const move = useCallback(
    (id: string, x: number, z: number) => editItem(id, { x, z }),
    [editItem],
  );
  const add = (kind: ItemKind) => {
    const item = findPlacement(kind, layout, catalog);
    if (!item) {
      setNotice({
        error: true,
        text: 'Chưa đủ chỗ trống. Hãy di chuyển hoặc bỏ bớt đồ trong phòng.',
      });
      return;
    }
    commit({ ...layout, items: [...layout.items, item] });
    select(item.id);
    setNotice(null);
  };
  const remove = () => {
    if (selected) {
      commit({ ...layout, items: layout.items.filter((item) => item.id !== selected.id) });
      setSelectedId(null);
      setNotice(null);
    }
  };
  const rotate = () => {
    if (selected)
      editItem(selected.id, { rotation: ((selected.rotation + 90) % 360) as RoomItem['rotation'] });
  };

  /** Bỏ shortcut khi đang nhập hoặc ở modal; mỗi phím dịch chuyển một ô và đi qua validation như thao tác chuột. */
  const shortcuts = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      (event.target as HTMLElement).closest(
        'input,select,textarea,[contenteditable],[role="dialog"]',
      )
    )
      return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      dispatch({ type: event.shiftKey ? 'redo' : 'undo' });
      return;
    }
    if (!selected) return;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-catalog.room.snap, 0],
      ArrowRight: [catalog.room.snap, 0],
      ArrowUp: [0, -catalog.room.snap],
      ArrowDown: [0, catalog.room.snap],
    };
    if (delta[event.key]) {
      event.preventDefault();
      move(selected.id, selected.x + delta[event.key][0], selected.z + delta[event.key][1]);
    } else if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      rotate();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      remove();
    } else if (event.key === 'Escape') setSelectedId(null);
  };
  const save = useMutation({
    mutationFn: async ({ layout: next, key }: { layout: RoomLayout; key: string }) =>
      (
        await api<{ data: RoomSnapshot }>('/rooms', {
          method: 'POST',
          headers: { 'Idempotency-Key': key },
          body: JSON.stringify({ layout: next }),
        })
      ).data,
    onSuccess: (snapshot) => {
      setSaved(snapshot);
      setCopied(false);
      setShareOpen(true);
    },
  });
  /** Giữ key cho cùng payload sau lỗi mạng; lần chỉnh sửa mới nhận key mới để không xung đột với snapshot cũ. */
  const persist = () => {
    const nextTitle = title.trim();
    if (nextTitle.length < 2) {
      setTitleError('Tên thiết kế cần ít nhất 2 ký tự.');
      return;
    }
    const next = { ...layout, title: nextTitle };
    setTitleError('');
    commit(next);
    const payload = JSON.stringify(next);
    if (attempt.current?.payload !== payload)
      attempt.current = { payload, key: crypto.randomUUID() };
    save.mutate({ layout: next, key: attempt.current!.key });
  };
  const shareUrl = saved
    ? new URL(`/projects/room-studio/view/${saved.id}`, window.location.origin).href
    : '';
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      shareInput.current?.focus();
      shareInput.current?.select();
    }
  };
  const completed = challengeComplete(layout);
  return (
    <div className="room-studio" onKeyDown={shortcuts}>
      <StudioHeading>
        <Button variant="outline" onClick={() => setHelp(true)}>
          <HelpCircle size={17} />
          Hướng dẫn
        </Button>
        <Button className="room-save-button" onClick={persist} disabled={save.isPending}>
          {save.isPending ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
          {save.isPending ? 'Đang lưu…' : 'Lưu & chia sẻ'}
        </Button>
      </StudioHeading>
      <div className="room-document-bar">
        <label className="room-title-field">
          <span>Tên thiết kế</span>
          <input
            aria-label="Tên thiết kế"
            maxLength={80}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setTitleError('');
            }}
            onBlur={() => {
              if (title.trim().length >= 2) commit({ ...layout, title: title.trim() });
              else setTitleError('Tên thiết kế cần ít nhất 2 ký tự.');
            }}
            aria-invalid={!!titleError}
            aria-describedby={titleError ? 'room-title-error' : undefined}
          />
        </label>
        <span className={`room-draft-status ${draftSaved ? '' : 'is-warning'}`}>
          <Check size={14} />
          {draftSaved ? 'Bản nháp tự động lưu' : 'Nháp chỉ giữ trong phiên'}
        </span>
        <div className="room-history-actions">
          <Button
            variant="ghost"
            aria-label="Hoàn tác"
            disabled={!history.past.length}
            onClick={() => dispatch({ type: 'undo' })}
          >
            <Undo2 size={17} />
          </Button>
          <Button
            variant="ghost"
            aria-label="Làm lại"
            disabled={!history.future.length}
            onClick={() => dispatch({ type: 'redo' })}
          >
            <Redo2 size={17} />
          </Button>
          <span />
          <Button variant="ghost" onClick={() => setReset('starter')}>
            <RotateCcw size={15} />
            Phòng mẫu
          </Button>
          <Button variant="ghost" onClick={() => setReset('empty')}>
            <Trash2 size={15} />
            Làm trống
          </Button>
        </div>
      </div>
      {titleError && (
        <p id="room-title-error" className="room-inline-error" role="alert">
          {titleError}
        </p>
      )}
      {!draftSaved && (
        <div className="room-message" role="status">
          Trình duyệt chưa cho lưu nháp. Bạn vẫn có thể lưu và chia sẻ thiết kế.
        </div>
      )}
      {save.isError && (
        <div className="room-message is-error" role="alert">
          {save.error.message}{' '}
          <Button variant="ghost" onClick={persist}>
            Thử lưu lại
          </Button>
        </div>
      )}
      {notice && (
        <div
          className={`room-message ${notice.error ? 'is-error' : ''}`}
          role={notice.error ? 'alert' : 'status'}
        >
          {notice.text}
          <Button variant="ghost" aria-label="Đóng thông báo" onClick={() => setNotice(null)}>
            <X size={15} />
          </Button>
        </div>
      )}
      <div className="room-mobile-tabs" aria-label="Bảng chỉnh sửa">
        <button
          aria-pressed={mobilePanel === 'catalog'}
          aria-controls="room-catalog-panel"
          onClick={() => setMobilePanel('catalog')}
        >
          <Plus size={16} />
          Đồ nội thất
        </button>
        <button
          aria-pressed={mobilePanel === 'inspector'}
          aria-controls="room-inspector-panel"
          onClick={() => setMobilePanel('inspector')}
        >
          <Move size={16} />
          Chỉnh sửa
        </button>
      </div>
      <div className="room-workspace">
        <aside
          id="room-catalog-panel"
          className={`room-panel room-catalog ${mobilePanel === 'catalog' ? 'is-active' : ''}`}
          aria-label="Danh mục đồ nội thất"
        >
          <div className="room-panel-heading">
            <div>
              <span className="eyebrow">THÊM MỘT CHÚT CÁ TÍNH</span>
              <h2>Đồ nội thất</h2>
            </div>
            <span className="room-count">
              {layout.items.length}/{catalog.room.maxItems}
            </span>
          </div>
          <div className="room-catalog-grid">
            {catalog.items.map((spec) => {
              const Icon = icons[spec.kind];
              return (
                <button
                  key={spec.kind}
                  className="room-catalog-item"
                  aria-label={`Thêm ${spec.label}`}
                  disabled={layout.items.length >= catalog.room.maxItems}
                  onClick={() => add(spec.kind)}
                >
                  <span className="room-item-art" style={{ background: `${spec.color}30` }}>
                    <Icon size={31} strokeWidth={1.35} />
                    <span>
                      <Plus size={12} />
                    </span>
                  </span>
                  <strong>{spec.label}</strong>
                  <small>
                    {spec.width} × {spec.depth} m
                  </small>
                </button>
              );
            })}
          </div>
          <div className="room-catalog-hint">
            <MousePointer2 size={15} />
            <p>Chạm để thêm. Kéo đồ trong phòng để tìm vị trí bạn thích.</p>
          </div>
          <div className="room-object-list">
            <h3>
              Đang ở trong phòng <span>{layout.items.length}</span>
            </h3>
            {layout.items.length ? (
              layout.items.map((item, index) => {
                const spec = catalog.items.find((model) => model.kind === item.kind)!;
                const Icon = icons[item.kind];
                return (
                  <button
                    key={item.id}
                    aria-label={`Chọn ${spec.label} ${index + 1}`}
                    aria-pressed={item.id === selected?.id}
                    onClick={() => select(item.id)}
                  >
                    <span style={{ background: item.color }}>
                      <Icon size={14} />
                    </span>
                    {spec.label}
                    <small>{String(index + 1).padStart(2, '0')}</small>
                  </button>
                );
              })
            ) : (
              <p className="room-empty-copy">Phòng đang trống. Thêm món đồ đầu tiên để bắt đầu.</p>
            )}
          </div>
        </aside>
        <Viewport
          layout={layout}
          catalog={catalog}
          selectedId={selected?.id || null}
          onSelect={select}
          onMove={move}
        />
        <aside
          id="room-inspector-panel"
          className={`room-panel room-inspector ${mobilePanel === 'inspector' ? 'is-active' : ''}`}
          aria-label="Thuộc tính căn phòng và đồ nội thất"
        >
          {selected ? (
            <div className="room-selected-editor">
              <div className="room-panel-heading">
                <div>
                  <span className="eyebrow">ĐANG CHỌN</span>
                  <h2>{catalog.items.find((spec) => spec.kind === selected.kind)!.label}</h2>
                </div>
                <Button variant="ghost" aria-label="Bỏ chọn đồ" onClick={() => setSelectedId(null)}>
                  <X size={15} />
                </Button>
              </div>
              <div className="room-item-actions">
                <Button variant="outline" onClick={rotate}>
                  <RotateCw size={15} />
                  Xoay 90°
                </Button>
                <Button variant="ghost" aria-label="Xóa đồ đang chọn" onClick={remove}>
                  <Trash2 size={16} />
                </Button>
              </div>
              <div className="room-control-label">
                Vị trí <span>{selected.rotation}°</span>
              </div>
              <div className="room-position-fields">
                <label>
                  Ngang (X)
                  <input
                    aria-label="Vị trí X"
                    type="number"
                    step={catalog.room.snap}
                    min={-3}
                    max={3}
                    value={selected.x}
                    onChange={(event) => {
                      if (Number.isFinite(event.target.valueAsNumber))
                        move(selected.id, event.target.valueAsNumber, selected.z);
                    }}
                  />
                  <small>m</small>
                </label>
                <label>
                  Sâu (Z)
                  <input
                    aria-label="Vị trí Z"
                    type="number"
                    step={catalog.room.snap}
                    min={-2.5}
                    max={2.5}
                    value={selected.z}
                    onChange={(event) => {
                      if (Number.isFinite(event.target.valueAsNumber))
                        move(selected.id, selected.x, event.target.valueAsNumber);
                    }}
                  />
                  <small>m</small>
                </label>
              </div>
              <div className="room-nudge">
                <Button
                  variant="outline"
                  aria-label="Dịch đồ sang trái"
                  onClick={() => move(selected.id, selected.x - 0.25, selected.z)}
                >
                  <ArrowLeft size={15} />
                </Button>
                <Button
                  variant="outline"
                  aria-label="Dịch đồ sang phải"
                  onClick={() => move(selected.id, selected.x + 0.25, selected.z)}
                >
                  <ArrowRight size={15} />
                </Button>
                <Button
                  variant="outline"
                  aria-label="Dịch đồ về phía tường sau"
                  onClick={() => move(selected.id, selected.x, selected.z - 0.25)}
                >
                  <ChevronRight size={15} className="room-arrow-up" />
                </Button>
                <Button
                  variant="outline"
                  aria-label="Dịch đồ về phía trước"
                  onClick={() => move(selected.id, selected.x, selected.z + 0.25)}
                >
                  <ChevronRight size={15} className="room-arrow-down" />
                </Button>
              </div>
              <div className="room-control-label">
                Màu món đồ
                <label className="room-custom-color">
                  <input
                    type="color"
                    aria-label="Màu đồ nội thất"
                    value={selected.color}
                    onChange={(event) => editItem(selected.id, { color: event.target.value })}
                  />
                  <span>Tùy chọn</span>
                </label>
              </div>
              <div className="room-color-swatches">
                {colors.map((color) => (
                  <button
                    key={color}
                    style={{ background: color }}
                    aria-label={`Đổi màu đồ sang ${color}`}
                    aria-pressed={selected.color === color}
                    onClick={() => editItem(selected.id, { color })}
                  >
                    {selected.color === color && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="room-selection-empty">
              <span>
                <MousePointer2 size={23} />
              </span>
              <h2>Chọn một món đồ</h2>
              <p>Chọn trong phòng hoặc danh sách để chỉnh vị trí, màu sắc và góc xoay.</p>
            </div>
          )}
          <div className="room-settings">
            <div className="room-panel-heading">
              <div>
                <span className="eyebrow">TẠO BẦU KHÔNG KHÍ</span>
                <h2>Căn phòng</h2>
              </div>
              <span className="room-size-badge">6 × 5 m</span>
            </div>
            <div className="room-control-label">Bảng màu</div>
            <div className="room-palette-list">
              {catalog.palettes.map((palette) => (
                <button
                  key={palette.id}
                  aria-label={`Bảng màu ${palette.label}`}
                  aria-pressed={layout.palette === palette.id}
                  onClick={() =>
                    commit({
                      ...layout,
                      palette: palette.id,
                      wallColor: palette.wallColor,
                      floorColor: palette.floorColor,
                    })
                  }
                >
                  <span style={{ background: palette.wallColor }}>
                    <i style={{ background: palette.floorColor }} />
                    {layout.palette === palette.id && <Check size={12} />}
                  </span>
                  <small>{palette.label}</small>
                </button>
              ))}
            </div>
            <div className="room-surface-colors">
              <label>
                <input
                  type="color"
                  aria-label="Màu tường"
                  value={layout.wallColor}
                  onChange={(event) => commit({ ...layout, wallColor: event.target.value })}
                />
                Tường
              </label>
              <label>
                <input
                  type="color"
                  aria-label="Màu sàn"
                  value={layout.floorColor}
                  onChange={(event) => commit({ ...layout, floorColor: event.target.value })}
                />
                Sàn
              </label>
            </div>
            <div className="room-control-label">Ánh sáng</div>
            <div className="room-light-switch">
              <button
                aria-pressed={layout.lighting === 'day'}
                onClick={() => commit({ ...layout, lighting: 'day' })}
              >
                <Sun size={15} />
                Ban ngày
              </button>
              <button
                aria-pressed={layout.lighting === 'night'}
                onClick={() => commit({ ...layout, lighting: 'night' })}
              >
                <Moon size={15} />
                Ban đêm
              </button>
            </div>
          </div>
          <div className={`room-challenge ${completed ? 'is-complete' : ''}`} role="status">
            <span>{completed ? <CheckCheck size={18} /> : <Sprout size={18} />} THỬ THÁCH NHỎ</span>
            <strong>{completed ? 'Góc làm việc đã sẵn sàng!' : 'Góc làm việc tối giản'}</strong>
            <p>
              {completed
                ? 'Bạn đã tạo một góc với bàn, ghế, đèn và tối đa 5 món.'
                : 'Có bàn, ghế, đèn và tối đa 5 món đồ. Ít hơn một chút, thoáng hơn một chút.'}
            </p>
          </div>
        </aside>
      </div>
      <div className="room-bottom-note">
        <span>
          <Check size={13} />
          Bản nháp giữ trên trình duyệt này. Lưu để có liên kết chia sẻ.
        </span>
        {saved && (
          <Link to={`/projects/room-studio/view/${saved.id}`}>
            Xem bản lưu gần nhất <ArrowRight size={13} />
          </Link>
        )}
      </div>
      {reset && (
        <Modal
          title={reset === 'empty' ? 'Bắt đầu với phòng trống?' : 'Trở về phòng mẫu?'}
          onClose={() => setReset(null)}
        >
          <p>
            {reset === 'empty'
              ? 'Đồ hiện tại sẽ được bỏ khỏi phòng. Bạn có thể hoàn tác để đưa chúng trở lại.'
              : 'Phòng sẽ dùng thiết kế mẫu ban đầu. Bạn có thể hoàn tác để khôi phục thiết kế hiện tại.'}
          </p>
          <div className="form-actions">
            <Button variant="outline" onClick={() => setReset(null)}>
              Giữ thiết kế
            </Button>
            <Button
              onClick={() => {
                commit(
                  reset === 'empty' ? { ...layout, items: [] } : structuredClone(catalog.starter),
                );
                setSelectedId(null);
                setReset(null);
                setNotice(null);
              }}
            >
              {reset === 'empty' ? 'Làm trống phòng' : 'Dùng phòng mẫu'}
            </Button>
          </div>
        </Modal>
      )}
      {help && (
        <Modal title="Một vài thao tác nhỏ" onClose={() => setHelp(false)}>
          <div className="room-help">
            <p>
              <strong>Thêm đồ:</strong> chọn món trong danh mục. Room Studio tìm một vị trí trống
              cho bạn.
            </p>
            <p>
              <strong>Đặt đồ:</strong> kéo trực tiếp trong phòng. Đồ được căn theo ô 0,25 m; vị trí
              chồng lấn hoặc ngoài phòng được giữ lại ở chỗ cũ.
            </p>
            <p>
              <strong>Xem phòng:</strong> chuyển sang “Xem phòng” để xoay, dùng cuộn chuột hoặc nút
              zoom.
            </p>
            <p>
              <strong>Bàn phím:</strong> chọn đồ rồi dùng ← ↑ → ↓ để dịch chuyển theo trục phòng; R
              xoay, Delete xóa, Ctrl/⌘ + Z hoàn tác, thêm Shift để làm lại.
            </p>
            <p>
              <strong>Lưu & chia sẻ:</strong> tạo bản lưu để người khác xem. Các lần sửa sau cần lưu
              lại để có liên kết mới.
            </p>
          </div>
        </Modal>
      )}
      {shareOpen && saved && (
        <Modal title="Thiết kế đã được lưu" onClose={() => setShareOpen(false)}>
          <p className="room-share-copy">
            Một góc của bạn, sẵn sàng để chia sẻ. Liên kết mở bản lưu chỉ để xem.
          </p>
          <label className="field">
            Liên kết chia sẻ
            <input
              ref={shareInput}
              aria-label="Liên kết chia sẻ"
              readOnly
              value={shareUrl}
              onFocus={(event) => event.target.select()}
            />
          </label>
          <div className="room-share-actions">
            <Button variant="outline" onClick={() => void copyLink()}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Đã sao chép' : 'Sao chép liên kết'}
            </Button>
            <Link className="btn btn-primary" to={`/projects/room-studio/view/${saved.id}`}>
              Mở bản chia sẻ <ArrowRight size={16} />
            </Link>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RoomViewer({ catalog, snapshot }: { catalog: RoomCatalog; snapshot: RoomSnapshot }) {
  const navigate = useNavigate();
  const copy = () =>
    navigate('/projects/room-studio', {
      state: {
        roomCopy: {
          ...structuredClone(snapshot.layout),
          title: `${snapshot.title.slice(0, 69)} (bản sao)`,
        },
      },
    });
  return (
    <div className="room-studio room-readonly">
      <StudioHeading readonly>
        <Link className="btn btn-outline" to="/projects/room-studio">
          <ArrowLeft size={16} />
          Về studio
        </Link>
        <Button onClick={copy}>
          <Copy size={16} />
          Tạo bản sao để chỉnh sửa
        </Button>
      </StudioHeading>
      <div className="room-viewer-title">
        <h2>{snapshot.title}</h2>
        <span>
          <Eye size={14} />
          BẢN CHIA SẺ · CHỈ XEM
        </span>
      </div>
      <div className="room-viewer-layout">
        <Viewport layout={snapshot.layout} catalog={catalog} readonly />
        <aside className="room-panel room-shared-summary" aria-label="Thông tin thiết kế">
          <span className="eyebrow">MỘT GÓC RIÊNG</span>
          <h2>Trong căn phòng này</h2>
          <p>{snapshot.layout.items.length} món đồ · 6 × 5 m</p>
          <div className="room-object-list">
            {snapshot.layout.items.map((item, index) => {
              const spec = catalog.items.find((entry) => entry.kind === item.kind)!;
              const Icon = icons[item.kind];
              return (
                <div key={item.id}>
                  <span style={{ background: item.color }}>
                    <Icon size={15} />
                  </span>
                  {spec.label}
                  <small>{String(index + 1).padStart(2, '0')}</small>
                </div>
              );
            })}
          </div>
          <div className="room-viewer-tip">
            <Sprout size={22} />
            <p>Thích một chi tiết trong phòng? Tạo bản sao và biến nó thành không gian của bạn.</p>
          </div>
          <small>
            Lưu lúc{' '}
            {new Date(snapshot.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}{' '}
            (UTC+7)
          </small>
        </aside>
      </div>
    </div>
  );
}

export default function RoomStudio() {
  const { id } = useParams();
  const catalog = useQuery({
    queryKey: ['room-catalog'],
    queryFn: ({ signal }) => api<{ data: RoomCatalog }>('/rooms/catalog', { signal }),
    staleTime: 5 * 60 * 1000,
  });
  const snapshot = useQuery({
    queryKey: ['room-snapshot', id],
    queryFn: ({ signal }) => api<{ data: RoomSnapshot }>(`/rooms/${id}`, { signal }),
    enabled: !!id,
  });
  if (catalog.isPending || catalog.isError || (id && (snapshot.isPending || snapshot.isError)))
    return (
      <div className="room-studio">
        <StudioHeading readonly={!!id} />
        <State
          loading={catalog.isPending || (!!id && snapshot.isPending)}
          error={catalog.error || snapshot.error}
          onRetry={() => {
            void catalog.refetch();
            if (id) void snapshot.refetch();
          }}
        />
        <Link className="back-link" to="/projects/room-studio">
          <ArrowLeft size={16} />
          Về Room Studio
        </Link>
      </div>
    );
  if (id) {
    if (!snapshot.data || !isRoomLayout(snapshot.data.data.layout, catalog.data.data))
      return (
        <div className="room-studio">
          <StudioHeading readonly />
          <State error={new Error('Thiết kế chưa tương thích. Vui lòng mở một bản lưu khác.')} />
        </div>
      );
    return <RoomViewer catalog={catalog.data.data} snapshot={snapshot.data.data} />;
  }
  return <RoomEditor catalog={catalog.data.data} />;
}
