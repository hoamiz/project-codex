import { Router } from 'express';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { pool } from '../db.js';
import { HttpError } from '../errors.js';
export const leadsRouter = Router();
const schema = z
  .object({
    carId: z.uuid(),
    type: z.enum(['consultation', 'test_drive']),
    name: z.string().trim().min(2).max(100),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{9,20}$/, 'Số điện thoại không hợp lệ'),
    email: z.preprocess((v) => (v === '' ? undefined : v), z.email().max(200).optional()),
    preferredAt: z.iso.datetime({ offset: true }).optional(),
    message: z.string().trim().max(1000).optional(),
  })
  .strict();
const newLeadSchema = schema.superRefine((x, ctx) => {
  if (x.type === 'test_drive' && (!x.preferredAt || Date.parse(x.preferredAt) <= Date.now()))
    ctx.addIssue({
      code: 'custom',
      path: ['preferredAt'],
      message: 'Chọn lịch lái thử trong tương lai.',
    });
});
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMIT', message: 'Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau.' },
  },
});
/** Khóa theo key để retry đồng thời chỉ ghi một lần; kết quả cũ vẫn trả được sau archive/ngày hẹn đã qua. */
leadsRouter.post('/leads', limiter, async (req, res) => {
  const key = z.uuid().parse(req.get('Idempotency-Key'));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [key]);
    const existing = (
      await client.query('SELECT id,status,payload_hash FROM leads WHERE idempotency_key=$1', [key])
    ).rows[0];
    // Retry chỉ kiểm tra cấu trúc/hash; điều kiện thời gian và xe áp dụng cho yêu cầu mới.
    const data = (existing ? schema : newLeadSchema).parse(req.body);
    const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    let row = existing;
    if (existing) {
      if (existing.payload_hash !== hash)
        throw new HttpError(409, 'CONFLICT', 'Mã yêu cầu đã được dùng với dữ liệu khác.');
    } else {
      const car = await client.query(
        "SELECT id FROM cars WHERE id=$1 AND status='available' FOR UPDATE",
        [data.carId],
      );
      if (!car.rowCount)
        throw new HttpError(409, 'CAR_UNAVAILABLE', 'Xe này hiện không nhận yêu cầu.');
      row = (
        await client.query(
          'INSERT INTO leads(car_id,type,name,phone,email,preferred_at,message,idempotency_key,payload_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,status',
          [
            data.carId,
            data.type,
            data.name,
            data.phone,
            data.email ?? null,
            data.preferredAt ?? null,
            data.message ?? null,
            key,
            hash,
          ],
        )
      ).rows[0];
    }
    await client.query('COMMIT');
    res.status(existing ? 200 : 201).json({ data: { id: row.id, status: row.status } });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});
