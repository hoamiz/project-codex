export type ItemKind = 'bed' | 'desk' | 'chair' | 'shelf' | 'lamp' | 'plant';
export interface RoomItem {
  id: string;
  kind: ItemKind;
  x: number;
  z: number;
  rotation: 0 | 90 | 180 | 270;
  color: string;
}
export interface RoomLayout {
  schemaVersion: 1;
  title: string;
  palette: 'sage' | 'peach' | 'lavender';
  wallColor: string;
  floorColor: string;
  lighting: 'day' | 'night';
  items: RoomItem[];
}
export interface FurnitureSpec {
  kind: ItemKind;
  label: string;
  description: string;
  width: number;
  depth: number;
  height: number;
  color: string;
}
export interface RoomCatalog {
  room: { width: number; depth: number; snap: number; maxItems: number };
  items: FurnitureSpec[];
  palettes: {
    id: RoomLayout['palette'];
    label: string;
    wallColor: string;
    floorColor: string;
    accent: string;
  }[];
  starter: RoomLayout;
}
export interface RoomSnapshot {
  id: string;
  title: string;
  layout: RoomLayout;
  createdAt: string;
}
export const DRAFT_KEY = 'project-codex-room-draft-v1';
export const snap = (value: number, step = 0.25) => Math.round(value / step) * step;

/** Footprint lấy từ catalog API; model xoay góc vuông nên có thể kiểm tra va chạm bằng hình chữ nhật trên sàn. */
export function footprint(item: RoomItem, catalog: RoomCatalog): [number, number] {
  const spec = catalog.items.find((model) => model.kind === item.kind)!;
  return item.rotation % 180 === 0 ? [spec.width, spec.depth] : [spec.depth, spec.width];
}
export function placementError(
  item: RoomItem,
  items: RoomItem[],
  catalog: RoomCatalog,
): string | null {
  if (
    !Number.isFinite(item.x) ||
    !Number.isFinite(item.z) ||
    snap(item.x, catalog.room.snap) !== item.x ||
    snap(item.z, catalog.room.snap) !== item.z
  )
    return 'Vị trí cần khớp ô lưới 0,25 m.';
  const [width, depth] = footprint(item, catalog);
  if (
    Math.abs(item.x) + width / 2 > catalog.room.width / 2 + 1e-6 ||
    Math.abs(item.z) + depth / 2 > catalog.room.depth / 2 + 1e-6
  )
    return 'Món đồ cần nằm trong phòng.';
  for (const other of items) {
    if (other.id === item.id) continue;
    const [otherWidth, otherDepth] = footprint(other, catalog);
    if (
      Math.abs(item.x - other.x) < (width + otherWidth) / 2 - 1e-6 &&
      Math.abs(item.z - other.z) < (depth + otherDepth) / 2 - 1e-6
    )
      return 'Vị trí này đang có đồ. Hãy chọn một khoảng trống.';
  }
  return null;
}

/** Tìm ô trống gần tâm phòng nhất; không tự đẩy đồ cũ hoặc bỏ giới hạn khi phòng đã đầy. */
export function findPlacement(
  kind: ItemKind,
  layout: RoomLayout,
  catalog: RoomCatalog,
): RoomItem | null {
  if (layout.items.length >= catalog.room.maxItems) return null;
  const spec = catalog.items.find((item) => item.kind === kind)!;
  const item: RoomItem = {
    id: crypto.randomUUID(),
    kind,
    x: 0,
    z: 0,
    rotation: 0,
    color: spec.color,
  };
  const points: { x: number; z: number }[] = [];
  for (let x = -catalog.room.width / 2; x <= catalog.room.width / 2; x += catalog.room.snap)
    for (let z = -catalog.room.depth / 2; z <= catalog.room.depth / 2; z += catalog.room.snap)
      points.push({ x, z });
  points.sort((a, b) => a.x * a.x + a.z * a.z - (b.x * b.x + b.z * b.z));
  for (const position of points) {
    const candidate = { ...item, ...position };
    if (!placementError(candidate, layout.items, catalog)) return candidate;
  }
  return null;
}

/** Chỉ commit placement hợp lệ; thao tác lỗi giữ nguyên layout để history và bản nháp không bị hỏng. */
export function updateItem(
  layout: RoomLayout,
  id: string,
  patch: Partial<Pick<RoomItem, 'x' | 'z' | 'rotation' | 'color'>>,
  catalog: RoomCatalog,
) {
  const old = layout.items.find((item) => item.id === id);
  if (!old) return { layout, error: 'Món đồ không còn trong phòng.' };
  const item = { ...old, ...patch };
  const error = placementError(item, layout.items, catalog);
  return error
    ? { layout, error }
    : {
        layout: { ...layout, items: layout.items.map((entry) => (entry.id === id ? item : entry)) },
        error: null,
      };
}

export interface History {
  past: RoomLayout[];
  present: RoomLayout;
  future: RoomLayout[];
}
type HistoryAction = { type: 'commit'; layout: RoomLayout } | { type: 'undo' | 'redo' };
/** Một lần kéo chỉ tạo một commit; history có giới hạn để không tích lũy layout vô hạn trong phiên. */
export function historyReducer(state: History, action: HistoryAction): History {
  if (action.type === 'commit') {
    if (JSON.stringify(action.layout) === JSON.stringify(state.present)) return state;
    return { past: [...state.past.slice(-39), state.present], present: action.layout, future: [] };
  }
  if (action.type === 'undo' && state.past.length)
    return {
      past: state.past.slice(0, -1),
      present: state.past.at(-1)!,
      future: [state.present, ...state.future],
    };
  if (action.type === 'redo' && state.future.length)
    return {
      past: [...state.past, state.present],
      present: state.future[0],
      future: state.future.slice(1),
    };
  return state;
}

/** Nháp local và bản chia sẻ được kiểm tra trước khi đưa vào WebGL; dữ liệu cũ/hỏng không thành tọa độ hoặc màu tùy ý. */
export function isRoomLayout(value: unknown, catalog: RoomCatalog): value is RoomLayout {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  const validColor = (color: unknown) =>
    typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color);
  if (
    data.schemaVersion !== 1 ||
    typeof data.title !== 'string' ||
    data.title.trim().length < 2 ||
    data.title.length > 80 ||
    !catalog.palettes.some((palette) => palette.id === data.palette) ||
    !validColor(data.wallColor) ||
    !validColor(data.floorColor) ||
    !['day', 'night'].includes(String(data.lighting)) ||
    !Array.isArray(data.items) ||
    data.items.length > catalog.room.maxItems
  )
    return false;
  const ids = new Set<string>();
  for (const raw of data.items) {
    if (!raw || typeof raw !== 'object') return false;
    const item = raw as Record<string, unknown>;
    if (
      typeof item.id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id) ||
      ids.has(item.id) ||
      !catalog.items.some((entry) => entry.kind === item.kind) ||
      !validColor(item.color) ||
      ![0, 90, 180, 270].includes(Number(item.rotation)) ||
      typeof item.rotation !== 'number' ||
      typeof item.x !== 'number' ||
      typeof item.z !== 'number' ||
      !Number.isFinite(item.x) ||
      !Number.isFinite(item.z) ||
      snap(item.x, catalog.room.snap) !== item.x ||
      snap(item.z, catalog.room.snap) !== item.z
    )
      return false;
    ids.add(item.id);
  }
  const layout = value as RoomLayout;
  return layout.items.every((item) => !placementError(item, layout.items, catalog));
}
export function loadDraft(catalog: RoomCatalog): RoomLayout {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (isRoomLayout(stored, catalog)) return stored;
  } catch {
    /* Storage bị chặn hoặc JSON hỏng: dùng phòng mẫu và vẫn cho chỉnh trong phiên. */
  }
  return structuredClone(catalog.starter);
}
export function challengeComplete(layout: RoomLayout) {
  return (
    layout.items.length <= 5 &&
    ['desk', 'chair', 'lamp'].every((kind) => layout.items.some((item) => item.kind === kind))
  );
}
