import { Router } from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { pool } from '../db.js';
import { checkOrigin } from './auth.js';
import { brickCatalog, saveBrickDesign, readBrickDesign } from '../services/bricks.js';
export const bricksRouter = Router();
bricksRouter.get('/bricks/catalog', (_req, res) => res.json({ data: brickCatalog }));
const saveLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMIT', message: 'Bạn đã lưu nhiều công trình. Vui lòng thử lại sau.' },
  },
});
/** Chỉ tạo snapshot; origin và giới hạn request áp dụng trước ghi, service giữ key retry trong transaction. */
bricksRouter.post('/bricks/designs', checkOrigin, saveLimit, async (req, res) => {
  const { layout } = z.object({ layout: z.unknown() }).strict().parse(req.body);
  const result = await saveBrickDesign(pool, layout, req.get('Idempotency-Key') || '');
  res.status(result.existing ? 200 : 201).json({ data: result.data });
});
bricksRouter.get('/bricks/designs/:id', async (req, res) =>
  res.json({ data: await readBrickDesign(pool, req.params.id) }),
);
