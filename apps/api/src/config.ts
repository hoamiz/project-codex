import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { readRuntimeConfig } from './services/runtime-config.js';
if (process.env.NODE_ENV !== 'production')
  dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
export const config = readRuntimeConfig(process.env);
