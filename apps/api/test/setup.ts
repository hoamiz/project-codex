import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
if (
  !process.env.TEST_DATABASE_URL ||
  new URL(process.env.TEST_DATABASE_URL).pathname != '/project_codex_test'
)
  throw new Error('Tests require isolated project_codex_test database');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
