import { Router, type Request } from 'express';
import { z } from 'zod';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import type { PoolClient } from 'pg';
import { pool } from '../db.js';
import { HttpError, pagination, paginationSchema } from '../errors.js';
import { createGame, flip, publicGame, type GameState } from '../services/game.js';
export const gameRouter = Router();
const difficulty = z.enum(['easy', 'medium', 'hard']);
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 80,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMIT', message: 'Bạn tạo nhiều phiên chơi. Vui lòng thử lại sau.' },
  },
});
/** SELECT FOR UPDATE giữ state nhất quán khi hai lượt đến đồng thời; chỉ token của phiên mới được đọc/chỉnh bàn. */
async function locked<T>(
  req: Request,
  action: (
    client: PoolClient,
    row: { id: string; state: GameState; expires_at: Date; token_hash: string },
  ) => Promise<T>,
) {
  const id = z.uuid().parse(req.params.id);
  const token = req.get('X-Game-Token') || '';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = (await client.query('SELECT * FROM game_sessions WHERE id=$1 FOR UPDATE', [id]))
      .rows[0];
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy phiên chơi.');
    if (
      !token ||
      !timingSafeEqual(Buffer.from(hash(token), 'hex'), Buffer.from(row.token_hash, 'hex'))
    )
      throw new HttpError(403, 'INVALID_TOKEN', 'Token phiên chơi không hợp lệ.');
    if (row.expires_at.getTime() <= Date.now())
      throw new HttpError(410, 'EXPIRED', 'Phiên chơi đã hết hạn. Bắt đầu ván mới nhé.');
    const result = await action(client, row);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
gameRouter.post('/games/memory/sessions', limiter, async (req, res) => {
  const body = z.object({ difficulty }).strict().parse(req.body);
  const token = randomBytes(32).toString('hex');
  const state = createGame(body.difficulty);
  const row = (
    await pool.query(
      "INSERT INTO game_sessions(token_hash,state,expires_at) VALUES($1,$2,now()+interval '1 hour') RETURNING id",
      [hash(token), JSON.stringify(state)],
    )
  ).rows[0];
  res.status(201).json({ data: { id: row.id, token, ...publicGame(state) } });
});
gameRouter.get('/games/memory/sessions/:id', async (req, res) => {
  const data = await locked(req, async (_client, row) => ({
    id: row.id,
    ...publicGame(row.state),
  }));
  res.json({ data });
});
gameRouter.post('/games/memory/sessions/:id/flips', async (req, res) => {
  const body = z
    .object({ cardId: z.string().max(20), version: z.number().int().min(1) })
    .strict()
    .parse(req.body);
  const data = await locked(req, async (client, row) => {
    const next = flip(row.state, body.cardId, body.version);
    await client.query('UPDATE game_sessions SET state=$1 WHERE id=$2', [
      JSON.stringify(next),
      row.id,
    ]);
    return { id: row.id, ...publicGame(next) };
  });
  res.json({ data });
});
/** Kết quả chỉ lấy từ state hoàn thành trong DB; unique session_id làm việc gửi lại không tạo điểm trùng. */
gameRouter.post('/games/memory/sessions/:id/results', async (req, res) => {
  const body = z
    .object({ nickname: z.string().trim().min(2).max(30) })
    .strict()
    .parse(req.body);
  const data = await locked(req, async (client, row) => {
    if (row.state.finishedAt === null)
      throw new HttpError(409, 'NOT_FINISHED', 'Hoàn thành ván chơi trước khi ghi kết quả.');
    const elapsed = row.state.finishedAt - row.state.startedAt;
    const r = await client.query(
      'INSERT INTO game_results(session_id,nickname,difficulty,moves,elapsed_ms) VALUES($1,$2,$3,$4,$5) ON CONFLICT(session_id) DO NOTHING RETURNING id,nickname,moves,elapsed_ms AS "elapsedMs"',
      [row.id, body.nickname, row.state.difficulty, row.state.moves, elapsed],
    );
    const result =
      r.rows[0] ||
      (
        await client.query(
          'SELECT id,nickname,moves,elapsed_ms AS "elapsedMs" FROM game_results WHERE session_id=$1',
          [row.id],
        )
      ).rows[0];
    if (result.nickname !== body.nickname)
      throw new HttpError(409, 'CONFLICT', 'Kết quả đã được lưu với nickname trước đó.');
    return result;
  });
  res.json({ data });
});
gameRouter.get('/games/memory/leaderboard', async (req, res) => {
  const q = z
    .object({ ...paginationSchema, difficulty })
    .strict()
    .parse(req.query);
  const total = Number(
    (await pool.query('SELECT count(*) FROM game_results WHERE difficulty=$1', [q.difficulty]))
      .rows[0].count,
  );
  const rows = await pool.query(
    'SELECT id,nickname,moves,elapsed_ms AS "elapsedMs",created_at AS "createdAt" FROM game_results WHERE difficulty=$1 ORDER BY moves,elapsed_ms,created_at,id LIMIT $2 OFFSET $3',
    [q.difficulty, q.pageSize, (q.page - 1) * q.pageSize],
  );
  res.json({ data: rows.rows, pagination: pagination(q.page, q.pageSize, total) });
});
