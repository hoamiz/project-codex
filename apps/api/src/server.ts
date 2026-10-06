import { app } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';
const server = app.listen(config.port, '127.0.0.1', () =>
  console.log(`Project Codex API listening on ${config.port}`),
);
for (const event of ['SIGINT', 'SIGTERM'])
  process.on(event, () =>
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    }),
  );
