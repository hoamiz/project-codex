import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
export const config = {
  databaseUrl: process.env.DATABASE_URL!,
  testDatabaseUrl: process.env.TEST_DATABASE_URL!,
  port: Number(process.env.PORT || 4100),
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET!,
  production: process.env.NODE_ENV === 'production',
  trustProxy: process.env.TRUST_PROXY === 'loopback' ? 'loopback' : false,
};
if (!config.databaseUrl || !config.sessionSecret)
  throw new Error('Missing DATABASE_URL or SESSION_SECRET');
const db = new URL(config.databaseUrl).pathname.slice(1);
if (!['project_codex_dev', 'project_codex_test'].includes(db))
  throw new Error('Database must belong to project-codex');
