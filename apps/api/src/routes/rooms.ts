import { Router } from 'express';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { pool } from '../db.js';
import { HttpError } from '../errors.js';
import { checkOrigin } from './auth.js';
import { roomCatalog, roomLayoutSchema, starterRoom } from '../services/room.js';

export const roomsRouter = Router();
roomsRouter.get('/rooms/catalog', (_req, res) =>
  res.json({ data: { ...roomCatalog, starter: starterRoom } }),
);
const limit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMIT', message: 'Bạn đã lưu nhiều thiết kế. Vui lòng thử lại sau.' },
  },
});

/** Snapshot chỉ ghi mới; khóa theo key giúp retry đồng thời trả cùng ID, không ghi đè thiết kế đã chia sẻ. */
roomsRouter.post('/rooms', checkOrigin, limit, async (req, res) => {
  const key = z.uuid().parse(req.get('Idempotency-Key'));
  const { layout } = z.object({ layout: roomLayoutSchema }).strict().parse(req.body);
  const hash = createHash('sha256').update(JSON.stringify(layout)).digest('hex');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [key]);
    let row = (
      await client.query(
        'SELECT id,title,layout,created_at,payload_hash FROM room_designs WHERE idempotency_key=$1',
        [key],
      )
    ).rows[0];
    const existing = !!row;
    if (row && row.payload_hash !== hash)
      throw new HttpError(409, 'CONFLICT', 'Mã lưu đã được dùng cho thiết kế khác.');
    if (!row)
      row = (
        await client.query(
          'INSERT INTO room_designs(title,layout,idempotency_key,payload_hash) VALUES($1,$2,$3,$4) RETURNING id,title,layout,created_at',
          [layout.title, JSON.stringify(layout), key, hash],
        )
      ).rows[0];
    await client.query('COMMIT');
    res.status(existing ? 200 : 201).json({
      data: { id: row.id, title: row.title, layout: row.layout, createdAt: row.created_at },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

roomsRouter.get('/rooms/:id', async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const row = (
    await pool.query('SELECT id,title,layout,created_at FROM room_designs WHERE id=$1', [id])
  ).rows[0];
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy thiết kế này.');
  res.json({
    data: { id: row.id, title: row.title, layout: row.layout, createdAt: row.created_at },
  });
});
