import { z } from 'zod';
import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { HttpError } from '../errors.js';
import { brickCatalog, brickKinds, layoutError, placementError } from './brick-geometry.js';
export { brickCatalog };
const brickSchema = z
  .object({
    id: z.uuid().transform((id) => id.toLowerCase()),
    kind: z.enum(brickKinds),
    color: z
      .string()
      .transform((color) => color.toLowerCase())
      .refine(
        (color) => brickCatalog.colors.some((c) => c.value === color),
        'Chọn màu trong catalog.',
      ),
    x: z.number().int(),
    y: z.number().int().min(0),
    z: z.number().int(),
    rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  })
  .strict();
/** Schema strict và geometry dùng chung kiểm tra cả layout; normalize trước hash, không sửa gạch lơ lửng. */
export const brickLayoutSchema = z
  .object({
    schemaVersion: z.literal(1),
    title: z.string().trim().min(2).max(80),
    bricks: z.array(brickSchema).max(brickCatalog.baseplate.maxBricks),
  })
  .strict()
  .superRefine((layout, ctx) => {
    const seen = new Set<string>();
    for (const [index, brick] of layout.bricks.entries()) {
      if (seen.has(brick.id))
        ctx.addIssue({
          code: 'custom',
          path: ['bricks', index, 'id'],
          message: 'Mã gạch bị trùng.',
        });
      seen.add(brick.id);
      const error = placementError(brick, layout.bricks, brickCatalog);
      if (error)
        ctx.addIssue({
          code: 'custom',
          path: ['bricks', index],
          message: `Gạch ${index + 1}: ${error}`,
        });
    }
    const error = layoutError(layout, brickCatalog);
    if (error && !layout.bricks.length)
      ctx.addIssue({ code: 'custom', path: ['bricks'], message: error });
  });

/** Hash layout chuẩn hóa, sort theo UUID để retry không phụ thuộc thứ tự mảng. Khóa key trong transaction giữ một snapshot khi gửi đồng thời. */
export async function saveBrickDesign(pool: Pool, input: unknown, rawKey: string) {
  const key = z.uuid().parse(rawKey).toLowerCase();
  const parsed = brickLayoutSchema.parse(input);
  const layout = { ...parsed, bricks: [...parsed.bricks].sort((a, b) => a.id.localeCompare(b.id)) };
  const hash = createHash('sha256').update(JSON.stringify(layout)).digest('hex');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`bricks:${key}`]);
    let row = (
      await client.query(
        'SELECT id,title,layout,created_at,payload_hash FROM brick_designs WHERE idempotency_key=$1',
        [key],
      )
    ).rows[0];
    const existing = !!row;
    if (row && row.payload_hash !== hash)
      throw new HttpError(409, 'CONFLICT', 'Mã lưu đã được dùng cho công trình khác.');
    if (!row)
      row = (
        await client.query(
          'INSERT INTO brick_designs(title,layout,idempotency_key,payload_hash) VALUES($1,$2,$3,$4) RETURNING id,title,layout,created_at',
          [layout.title, JSON.stringify(layout), key, hash],
        )
      ).rows[0];
    await client.query('COMMIT');
    return {
      existing,
      data: { id: row.id, title: row.title, layout: row.layout, createdAt: row.created_at },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
/** Snapshot công khai chỉ đọc; UUID validate trước query và SQL luôn có tham số. */
export async function readBrickDesign(pool: Pool, rawId: string) {
  const id = z.uuid().parse(rawId);
  const row = (
    await pool.query('SELECT id,title,layout,created_at FROM brick_designs WHERE id=$1', [id])
  ).rows[0];
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy công trình này.');
  return { id: row.id, title: row.title, layout: row.layout, createdAt: row.created_at };
}
