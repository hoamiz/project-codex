import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAdmin, checkCsrf, checkOrigin } from './auth.js';
import { carJson } from './public.js';
import { HttpError, pagination, paginationSchema } from '../errors.js';
export const adminRouter = Router();
adminRouter.use('/admin', requireAdmin);
adminRouter.use('/admin', (req, res, next) => {
  if (['POST', 'PATCH', 'DELETE'].includes(req.method))
    checkOrigin(req, res, (error?: unknown) => (error ? next(error) : checkCsrf(req, res, next)));
  else next();
});
const id = (value: unknown) => z.uuid().parse(value);
const carSchema = z
  .object({
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(100),
    brand: z.string().trim().min(1).max(80),
    model: z.string().trim().min(1).max(100),
    year: z.number().int().min(1900).max(2100),
    priceVnd: z.number().int().min(0).max(9000000000000),
    mileageKm: z.number().int().min(0).max(2000000),
    fuelType: z.enum(['petrol', 'diesel', 'electric', 'hybrid']),
    transmission: z.enum(['automatic', 'manual']),
    seats: z.number().int().min(2).max(12),
    description: z.string().trim().min(10).max(5000),
    status: z.enum(['available', 'reserved', 'sold', 'archived']),
    imagePaths: z
      .array(z.string().regex(/^\/images\/car-(?:[1-9]|1[0-2])\.svg$/))
      .min(1)
      .max(6),
  })
  .strict();
const carValues = (c: z.infer<typeof carSchema>) => [
  c.slug,
  c.brand,
  c.model,
  c.year,
  c.priceVnd,
  c.mileageKm,
  c.fuelType,
  c.transmission,
  c.seats,
  c.description,
  c.status,
  c.imagePaths,
];
adminRouter.get('/admin/cars', async (req, res) => {
  const q = z
    .object({
      ...paginationSchema,
      search: z.string().max(100).default(''),
      status: z.enum(['available', 'reserved', 'sold', 'archived', 'all']).default('all'),
    })
    .strict()
    .parse(req.query);
  const values = [`%${q.search}%`, q.status];
  const where = "(brand||' '||model) ILIKE $1 AND ($2='all' OR status=$2)";
  const total = Number(
    (await pool.query(`SELECT count(*) FROM cars WHERE ${where}`, values)).rows[0].count,
  );
  const rows = await pool.query(
    `SELECT * FROM cars WHERE ${where} ORDER BY created_at DESC,id LIMIT $3 OFFSET $4`,
    [...values, q.pageSize, (q.page - 1) * q.pageSize],
  );
  res.json({ data: rows.rows.map(carJson), pagination: pagination(q.page, q.pageSize, total) });
});
adminRouter.get('/admin/cars/:id', async (req, res) => {
  const row = (await pool.query('SELECT * FROM cars WHERE id=$1', [id(req.params.id)])).rows[0];
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy xe.');
  res.json({ data: carJson(row) });
});
adminRouter.post('/admin/cars', async (req, res) => {
  const c = carSchema.parse(req.body);
  const r = await pool.query(
    'INSERT INTO cars(slug,brand,model,year,price_vnd,mileage_km,fuel_type,transmission,seats,description,status,image_paths) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
    carValues(c),
  );
  res.status(201).json({ data: carJson(r.rows[0]) });
});
/** Version trong điều kiện UPDATE ngăn hai admin ghi đè thay đổi của nhau. */
adminRouter.patch('/admin/cars/:id', async (req, res) => {
  const { version, ...c } = carSchema.extend({ version: z.number().int().min(1) }).parse(req.body);
  const r = await pool.query(
    'UPDATE cars SET slug=$1,brand=$2,model=$3,year=$4,price_vnd=$5,mileage_km=$6,fuel_type=$7,transmission=$8,seats=$9,description=$10,status=$11,image_paths=$12,version=version+1,updated_at=now() WHERE id=$13 AND version=$14 RETURNING *',
    [...carValues(c), id(req.params.id), version],
  );
  if (!r.rowCount)
    throw new HttpError(409, 'CONFLICT', 'Xe đã được thay đổi. Vui lòng tải bản mới.');
  res.json({ data: carJson(r.rows[0]) });
});
adminRouter.delete('/admin/cars/:id', async (req, res) => {
  const { version } = z
    .object({ version: z.number().int().min(1) })
    .strict()
    .parse(req.body);
  const r = await pool.query(
    "UPDATE cars SET status='archived',version=version+1,updated_at=now() WHERE id=$1 AND version=$2 RETURNING *",
    [id(req.params.id), version],
  );
  if (!r.rowCount) throw new HttpError(409, 'CONFLICT', 'Xe đã được thay đổi. Vui lòng tải lại.');
  res.json({ data: carJson(r.rows[0]) });
});
const leadSelect = `SELECT l.id,l.car_id AS "carId",l.type,l.name,l.phone,l.email,l.preferred_at AS "preferredAt",l.message,l.status,l.version,l.created_at AS "createdAt",l.updated_at AS "updatedAt",c.brand||' '||c.model AS "carTitle" FROM leads l JOIN cars c ON l.car_id=c.id`;
adminRouter.get('/admin/leads', async (req, res) => {
  const q = z
    .object({
      ...paginationSchema,
      search: z.string().max(100).default(''),
      status: z.enum(['new', 'in_progress', 'completed', 'cancelled', 'all']).default('all'),
      type: z.enum(['consultation', 'test_drive', 'all']).default('all'),
    })
    .strict()
    .parse(req.query);
  const where =
    "(l.name||' '||l.phone) ILIKE $1 AND ($2='all' OR l.status=$2) AND ($3='all' OR l.type=$3)";
  const values = [`%${q.search}%`, q.status, q.type];
  const total = Number(
    (await pool.query(`SELECT count(*) FROM leads l WHERE ${where}`, values)).rows[0].count,
  );
  const r = await pool.query(
    `${leadSelect} WHERE ${where} ORDER BY l.created_at DESC,l.id LIMIT $4 OFFSET $5`,
    [...values, q.pageSize, (q.page - 1) * q.pageSize],
  );
  res.json({ data: r.rows, pagination: pagination(q.page, q.pageSize, total) });
});
adminRouter.get('/admin/leads/:id', async (req, res) => {
  const row = (await pool.query(`${leadSelect} WHERE l.id=$1`, [id(req.params.id)])).rows[0];
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy yêu cầu.');
  res.json({ data: row });
});
adminRouter.patch('/admin/leads/:id', async (req, res) => {
  const q = z
    .object({
      status: z.enum(['new', 'in_progress', 'completed', 'cancelled']),
      version: z.number().int().min(1),
    })
    .strict()
    .parse(req.body);
  const r = await pool.query(
    'UPDATE leads SET status=$1,version=version+1,updated_at=now() WHERE id=$2 AND version=$3 RETURNING id,status,version',
    [q.status, id(req.params.id), q.version],
  );
  if (!r.rowCount) throw new HttpError(409, 'CONFLICT', 'Yêu cầu đã thay đổi. Vui lòng tải lại.');
  res.json({ data: r.rows[0] });
});
/** Mốc ngày nghiệp vụ tính ở PostgreSQL theo UTC+7; generate_series giữ cả ngày có 0 lượt. */
adminRouter.get('/admin/stats', async (_req, res) => {
  const cars = (await pool.query('SELECT status,count(*)::int AS count FROM cars GROUP BY status'))
    .rows;
  const leads = (
    await pool.query('SELECT status,count(*)::int AS count FROM leads GROUP BY status')
  ).rows;
  const drives = (
    await pool.query(
      "WITH days AS (SELECT generate_series((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date-6,(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,'1 day')::date AS day) SELECT to_char(days.day,'YYYY-MM-DD') AS day,count(l.id)::int AS count FROM days LEFT JOIN leads l ON (l.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date=days.day AND l.type='test_drive' GROUP BY days.day ORDER BY days.day",
    )
  ).rows;
  res.json({ data: { cars, leads, testDrives: drives, timeZone: 'Asia/Ho_Chi_Minh' } });
});
