/** Hợp đồng hình học thuần: dùng cùng module ở API và FE, không import Node/DB/renderer. */
export const brickKinds = [
  'brick-1x1',
  'brick-1x2',
  'brick-1x3',
  'brick-1x4',
  'brick-2x2',
  'brick-2x3',
  'brick-2x4',
  'plate-1x2',
  'plate-2x2',
  'plate-2x4',
] as const;
export type BrickKind = (typeof brickKinds)[number];
export type Rotation = 0 | 90 | 180 | 270;
export interface Brick {
  id: string;
  kind: BrickKind;
  color: string;
  x: number;
  y: number;
  z: number;
  rotation: Rotation;
}
export interface BrickLayout {
  schemaVersion: 1;
  title: string;
  bricks: Brick[];
}
export interface BrickCatalog {
  schemaVersion: 1;
  baseplate: { width: number; depth: number; maxHeight: number; maxBricks: number };
  kinds: { kind: BrickKind; label: string; width: number; depth: number; height: number }[];
  colors: { label: string; value: string }[];
}
export const brickCatalog: BrickCatalog = {
  schemaVersion: 1,
  baseplate: { width: 32, depth: 32, maxHeight: 48, maxBricks: 150 },
  kinds: brickKinds.map((kind) => {
    const [width, depth] = kind.split('-')[1].split('x').map(Number);
    return {
      kind,
      label: `${kind.startsWith('plate') ? 'Tấm' : 'Gạch'} ${width} × ${depth}`,
      width,
      depth,
      height: kind.startsWith('plate') ? 1 : 3,
    };
  }),
  colors: [
    { label: 'Đỏ', value: '#ef4444' },
    { label: 'Cam', value: '#f97316' },
    { label: 'Vàng', value: '#facc15' },
    { label: 'Xanh lá', value: '#22c55e' },
    { label: 'Xanh dương', value: '#3b82f6' },
    { label: 'Tím', value: '#a855f7' },
    { label: 'Trắng', value: '#f8fafc' },
    { label: 'Đen', value: '#1f2937' },
  ],
};
export const emptyBricks = (): BrickLayout => ({
  schemaVersion: 1,
  title: 'Công trình của tôi',
  bricks: [],
});
/** Góc vuông hoán đổi rộng/sâu; tọa độ luôn là góc thấp nhất, height tính bằng plate. */
export function dimensions(brick: Brick, catalog: BrickCatalog) {
  const spec = catalog.kinds.find((k) => k.kind === brick.kind)!;
  return {
    width: brick.rotation % 180 ? spec.depth : spec.width,
    depth: brick.rotation % 180 ? spec.width : spec.depth,
    height: spec.height,
  };
}
/** Hộp nửa mở cho phép chạm mép; rotation chỉ đổi footprint, không đổi mốc x/z. */
export function intersectsXZ(a: Brick, b: Brick, catalog: BrickCatalog) {
  const da = dimensions(a, catalog),
    db = dimensions(b, catalog);
  return (
    a.x < b.x + db.width && b.x < a.x + da.width && a.z < b.z + db.depth && b.z < a.z + da.depth
  );
}
/** Candidate cần nằm trong đế, không xuyên thể tích và có ít nhất một nút được đỡ đúng độ cao đáy. */
export function placementError(
  brick: Brick,
  others: Brick[],
  catalog: BrickCatalog,
): string | null {
  const { width, depth, height } = dimensions(brick, catalog);
  if (![brick.x, brick.y, brick.z].every(Number.isInteger)) return 'Tọa độ phải là số nguyên.';
  if (
    brick.x < 0 ||
    brick.z < 0 ||
    brick.y < 0 ||
    brick.x + width > catalog.baseplate.width ||
    brick.z + depth > catalog.baseplate.depth ||
    brick.y + height > catalog.baseplate.maxHeight
  )
    return 'Gạch nằm ngoài chân đế hoặc quá cao.';
  const rest = others.filter((b) => b.id !== brick.id);
  if (
    rest.some(
      (b) =>
        intersectsXZ(brick, b, catalog) &&
        brick.y < b.y + dimensions(b, catalog).height &&
        b.y < brick.y + height,
    )
  )
    return 'Vị trí bị trùng với gạch khác.';
  if (
    brick.y &&
    !rest.some(
      (b) => intersectsXZ(brick, b, catalog) && b.y + dimensions(b, catalog).height === brick.y,
    )
  )
    return 'Gạch cần điểm tựa bên dưới.';
  return null;
}
/** Chiều cao preview là mặt trên cao nhất dưới footprint, không đặt xuyên các tầng. */
export function atPosition(
  brick: Brick,
  x: number,
  z: number,
  others: Brick[],
  catalog: BrickCatalog,
): Brick {
  const candidate = { ...brick, x: Math.round(x), z: Math.round(z), y: 0 };
  if (others.some((b) => b.id === brick.id) && candidate.x === brick.x && candidate.z === brick.z)
    return { ...brick };
  candidate.y = Math.max(
    0,
    ...others
      .filter((b) => b.id !== brick.id && intersectsXZ(candidate, b, catalog))
      .map((b) => b.y + dimensions(b, catalog).height),
  );
  return candidate;
}
/** Spawn chỉ tìm chỗ trống tầng đế theo z rồi x; không xóa/chồng khối có sẵn để tạo chỗ. */
export function freePosition(brick: Brick, others: Brick[], catalog: BrickCatalog): Brick | null {
  if (others.length >= catalog.baseplate.maxBricks) return null;
  const { width, depth } = dimensions(brick, catalog);
  for (let z = 0; z <= catalog.baseplate.depth - depth; z++)
    for (let x = 0; x <= catalog.baseplate.width - width; x++) {
      const candidate = { ...brick, x, y: 0, z };
      if (!placementError(candidate, others, catalog)) return candidate;
    }
  return null;
}
/** Sau mất chân đỡ, hạ từng khối từ thấp lên cao; không nâng khối hoặc thay đổi x/z. UUID phá hòa để kết quả độc lập thứ tự mảng. */
export function settle(bricks: Brick[], catalog: BrickCatalog): Brick[] {
  const settled: Brick[] = [];
  for (const brick of [...bricks].sort((a, b) => a.y - b.y || a.id.localeCompare(b.id))) {
    const levels = [
      0,
      ...settled
        .filter((b) => intersectsXZ(brick, b, catalog))
        .map((b) => b.y + dimensions(b, catalog).height),
    ]
      .filter((y) => y <= brick.y)
      .sort((a, b) => b - a);
    const y = levels.find((level) => !placementError({ ...brick, y: level }, settled, catalog));
    // Nếu input bất hợp lệ không có chỗ hạ, giữ nguyên để validator từ chối, không mất gạch âm thầm.
    settled.push({ ...brick, y: y ?? brick.y });
  }
  const byId = new Map(settled.map((b) => [b.id, b]));
  return bricks.map((b) => byId.get(b.id)!);
}
/** Kiểm tra toàn layout trước ghi nháp/DB; mỗi chuỗi support có chiều cao giảm nên kết thúc tại đế. */
export function layoutError(value: unknown, catalog: BrickCatalog): string | null {
  if (!value || typeof value !== 'object') return 'Thiết kế không hợp lệ.';
  const layout = value as BrickLayout;
  if (
    layout.schemaVersion !== 1 ||
    typeof layout.title !== 'string' ||
    layout.title.trim().length < 2 ||
    layout.title.trim().length > 80 ||
    !Array.isArray(layout.bricks) ||
    layout.bricks.length > catalog.baseplate.maxBricks
  )
    return 'Tiêu đề hoặc số lượng gạch không hợp lệ.';
  if (Object.keys(layout).some((k) => !['schemaVersion', 'title', 'bricks'].includes(k)))
    return 'Thiết kế có trường không hỗ trợ.';
  const seen = new Set<string>();
  for (const brick of layout.bricks) {
    if (
      !brick ||
      typeof brick !== 'object' ||
      typeof brick.id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        brick.id,
      ) ||
      seen.has(brick.id.toLowerCase())
    )
      return 'Mã gạch không hợp lệ hoặc trùng.';
    seen.add(brick.id.toLowerCase());
    if (
      Object.keys(brick).some(
        (k) => !['id', 'kind', 'color', 'x', 'y', 'z', 'rotation'].includes(k),
      ) ||
      !catalog.kinds.some((k) => k.kind === brick.kind) ||
      typeof brick.color !== 'string' ||
      !catalog.colors.some((c) => c.value === brick.color.toLowerCase()) ||
      ![0, 90, 180, 270].includes(brick.rotation)
    )
      return 'Loại, màu hoặc góc xoay không hợp lệ.';
  }
  for (const brick of layout.bricks) {
    const error = placementError(brick, layout.bricks, catalog);
    if (error) return error;
  }
  return null;
}
