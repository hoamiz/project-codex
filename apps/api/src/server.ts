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
const server = app.listen(config.port, config.host, () =>
  console.log(`Project Codex API listening on ${config.port}`),
);
let shuttingDown = false;
/** Dừng nhận request và chờ pool drain; deadline hữu hạn cho hosting đổi release kể cả còn socket treo. */
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  const deadline = setTimeout(() => {
    server.closeAllConnections();
    process.exit(1);
  }, config.shutdownTimeoutMs);
  deadline.unref();
  server.close(() => {
    void pool.end().then(() => {
      clearTimeout(deadline);
      process.exit(0);
    });
  });
}
for (const event of ['SIGINT', 'SIGTERM']) process.on(event, shutdown);
