import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { HttpError, pagination, paginationSchema } from '../errors.js';
export const publicRouter = Router();
/** PostgreSQL bigint không tự thành number; chỉ chuyển giá trong giới hạn schema và chuẩn hóa tên field cho FE. */
export function carJson(r: Record<string, unknown>) {
  return {
    id: r.id,
    slug: r.slug,
    brand: r.brand,
    model: r.model,
    year: r.year,
    priceVnd: Number(r.price_vnd),
    mileageKm: r.mileage_km,
    fuelType: r.fuel_type,
    transmission: r.transmission,
    seats: r.seats,
    description: r.description,
    status: r.status,
    imagePaths: r.image_paths,
    version: r.version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
publicRouter.get('/portfolio/projects', async (_req, res) => {
  const result = await pool.query(
    "SELECT slug,title,summary,description,stack,url,image_path AS \"imagePath\" FROM portfolio_projects ORDER BY CASE slug WHEN 'autohub' THEN 1 WHEN 'memory-match' THEN 2 ELSE 3 END",
  );
  res.json({ data: result.rows });
});
const querySchema = z
  .object({
    ...paginationSchema,
    search: z.string().max(100).optional(),
    brand: z.string().max(80).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    year: z.coerce.number().int().min(1900).max(2100).optional(),
    status: z.enum(['available', 'reserved', 'sold', 'all']).default('available'),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'year_desc']).default('newest'),
  })
  .strict()
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    message: 'Giá tối thiểu phải nhỏ hơn giá tối đa',
    path: ['minPrice'],
  });
/** Filter dùng tham số; riêng ORDER BY chọn từ whitelist để không ghép SQL từ input. */
publicRouter.get('/cars', async (req, res) => {
  const q = querySchema.parse(req.query);
  const clauses = ["status!='archived'"];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    clauses.push(sql.replace('?', `$${values.length}`));
  };
  if (q.status !== 'all') add('status=?', q.status);
  if (q.search) add("(brand||' '||model) ILIKE ?", `%${q.search}%`);
  if (q.brand) add('brand=?', q.brand);
  if (q.minPrice !== undefined) add('price_vnd>=?', q.minPrice);
  if (q.maxPrice !== undefined) add('price_vnd<=?', q.maxPrice);
  if (q.year) add('year=?', q.year);
  const where = clauses.join(' AND ');
  const total = Number(
    (await pool.query(`SELECT count(*) FROM cars WHERE ${where}`, values)).rows[0].count,
  );
  const sorts = {
    newest: 'created_at DESC,id',
    price_asc: 'price_vnd ASC,id',
    price_desc: 'price_vnd DESC,id',
    year_desc: 'year DESC,id',
  };
  const rows = await pool.query(
    `SELECT * FROM cars WHERE ${where} ORDER BY ${sorts[q.sort]} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, q.pageSize, (q.page - 1) * q.pageSize],
  );
  res.json({ data: rows.rows.map(carJson), pagination: pagination(q.page, q.pageSize, total) });
});
publicRouter.get('/cars/brands', async (_req, res) =>
  res.json({
    data: (
      await pool.query("SELECT DISTINCT brand FROM cars WHERE status!='archived' ORDER BY brand")
    ).rows.map((r) => r.brand),
  }),
);
publicRouter.get('/cars/by-ids', async (req, res) => {
  const ids = z
    .string()
    .transform((s) => s.split(','))
    .pipe(z.array(z.uuid()).max(3).min(1))
    .parse(req.query.ids);
  const result = await pool.query(
    "SELECT * FROM cars WHERE id=ANY($1::uuid[]) AND status!='archived'",
    [ids],
  );
  res.json({ data: result.rows.map(carJson) });
});
publicRouter.get('/cars/:slug', async (req, res) => {
  const result = await pool.query("SELECT * FROM cars WHERE slug=$1 AND status!='archived'", [
    req.params.slug,
  ]);
  if (!result.rowCount) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy xe.');
  res.json({ data: carJson(result.rows[0]) });
});
