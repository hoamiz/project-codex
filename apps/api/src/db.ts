import pg from 'pg';
import { config } from './config.js';
export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  max: config.poolMax,
  ssl: config.databaseSsl,
});
pool.on('error', () => console.error('PostgreSQL connection unavailable'));
