import { app } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';
import { migrate } from './services/migrations.js';
// Nâng cấp DB trước khi nhận request để checkout mới đăng ký đủ project mà không cần seed lại.
// Runner có lock/checksum/transaction; giữ dữ liệu đã chỉnh và dừng startup nếu migration thất bại.
try {
  await migrate(pool);
} catch {
  console.error('Database upgrade failed; API did not start. Run npm run db:migrate to diagnose.');
  await pool.end();
  process.exit(1);
}
const server = app.listen(config.port, '127.0.0.1', () =>
  console.log(`Project Codex API listening on ${config.port}`),
);
for (const event of ['SIGINT', 'SIGTERM'])
  process.on(event, () =>
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    }),
  );
