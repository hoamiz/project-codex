import { z } from 'zod';

const kinds = ['bed', 'desk', 'chair', 'shelf', 'lamp', 'plant'] as const;
export const roomCatalog = {
  room: { width: 6, depth: 5, snap: 0.25, maxItems: 24 },
  items: [
    {
      kind: 'bed',
      label: 'Giường ngủ',
      description: 'Một giấc ngủ thật êm.',
      width: 1.7,
      depth: 2.05,
      height: 0.85,
      color: '#a6b69d',
    },
    {
      kind: 'desk',
      label: 'Bàn làm việc',
      description: 'Một góc cho ý tưởng.',
      width: 1.6,
      depth: 0.75,
      height: 1.2,
      color: '#c79c76',
    },
    {
      kind: 'chair',
      label: 'Ghế',
      description: 'Chỗ ngồi của riêng bạn.',
      width: 0.65,
      depth: 0.65,
      height: 1.05,
      color: '#ad9fc1',
    },
    {
      kind: 'shelf',
      label: 'Kệ sách',
      description: 'Giữ những điều nhỏ xinh.',
      width: 1.2,
      depth: 0.5,
      height: 1.6,
      color: '#c59c78',
    },
    {
      kind: 'lamp',
      label: 'Đèn đứng',
      description: 'Thêm một chút ấm áp.',
      width: 0.45,
      depth: 0.45,
      height: 1.7,
      color: '#e5c896',
    },
    {
      kind: 'plant',
      label: 'Cây xanh',
      description: 'Mang thiên nhiên vào phòng.',
      width: 0.65,
      depth: 0.65,
      height: 1.25,
      color: '#799775',
    },
  ],
  palettes: [
    {
      id: 'sage',
      label: 'Vườn xanh',
      wallColor: '#dfe6d8',
      floorColor: '#c5a17a',
      accent: '#738d72',
    },
    {
      id: 'peach',
      label: 'Nắng ấm',
      wallColor: '#f1dfd2',
      floorColor: '#cca88c',
      accent: '#c28570',
    },
    {
      id: 'lavender',
      label: 'Chiều tím',
      wallColor: '#e7dff0',
      floorColor: '#c2b0a4',
      accent: '#a58daf',
    },
  ],
} as const;

const color = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Màu phải có dạng #RRGGBB.')
  .transform((value) => value.toLowerCase());
const itemSchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(kinds),
    x: z.number().min(-3).max(3).multipleOf(0.25),
    z: z.number().min(-2.5).max(2.5).multipleOf(0.25),
    rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
    color,
  })
  .strict();

/** Đồ chỉ xoay theo góc vuông; footprint đổi chiều rộng/sâu khi xoay 90° hoặc 270°. */
function footprint(item: z.infer<typeof itemSchema>) {
  const model = roomCatalog.items.find((entry) => entry.kind === item.kind)!;
  return item.rotation % 180 === 0 ? [model.width, model.depth] : [model.depth, model.width];
}

/** Backend kiểm tra cùng kích thước catalog mà editor dùng, không tin tọa độ hoặc collision do client gửi. */
export const roomLayoutSchema = z
  .object({
    schemaVersion: z.literal(1),
    title: z.string().trim().min(2).max(80),
    palette: z.enum(['sage', 'peach', 'lavender']),
    wallColor: color,
    floorColor: color,
    lighting: z.enum(['day', 'night']),
    items: z.array(itemSchema).max(roomCatalog.room.maxItems),
  })
  .strict()
  .superRefine((layout, ctx) => {
    const seen = new Set<string>();
    for (const [index, item] of layout.items.entries()) {
      const [width, depth] = footprint(item);
      if (seen.has(item.id))
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'id'],
          message: 'Mã đồ nội thất bị trùng.',
        });
      seen.add(item.id);
      if (Math.abs(item.x) + width / 2 > 3 + 1e-6 || Math.abs(item.z) + depth / 2 > 2.5 + 1e-6)
        ctx.addIssue({
          code: 'custom',
          path: ['items', index],
          message: 'Đồ nội thất phải nằm trong phòng.',
        });
      for (const previous of layout.items.slice(0, index)) {
        const [otherWidth, otherDepth] = footprint(previous);
        // Tiếp xúc mép được phép; epsilon tránh sai số số thực tạo collision giả.
        if (
          Math.abs(item.x - previous.x) < (width + otherWidth) / 2 - 1e-6 &&
          Math.abs(item.z - previous.z) < (depth + otherDepth) / 2 - 1e-6
        )
          ctx.addIssue({
            code: 'custom',
            path: ['items', index],
            message: 'Đồ nội thất không được chồng lên nhau.',
          });
      }
    }
  });
export type RoomLayout = z.infer<typeof roomLayoutSchema>;

export const starterRoom: RoomLayout = {
  schemaVersion: 1,
  title: 'Một góc bình yên',
  palette: 'sage',
  wallColor: '#dfe6d8',
  floorColor: '#c5a17a',
  lighting: 'day',
  items: roomCatalog.items.map((model, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    kind: model.kind,
    color: model.color,
    ...[
      { x: -1.75, z: -1.25, rotation: 0 as const },
      { x: 1, z: -1.75, rotation: 0 as const },
      { x: 1, z: -0.75, rotation: 0 as const },
      { x: 2.25, z: 1, rotation: 90 as const },
      { x: -2.25, z: 1.5, rotation: 0 as const },
      { x: 2.5, z: -1.75, rotation: 0 as const },
    ][index],
  })),
};
