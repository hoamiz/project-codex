import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });
if (
  !process.env.TEST_DATABASE_URL ||
  new URL(process.env.TEST_DATABASE_URL).pathname != '/project_codex_test'
)
  throw new Error('E2E requires isolated test database');
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  // HTML reporter lưu giá trị locator.fill trong step; console không giữ credential trong artifact.
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' },
    trace: 'off',
    screenshot: 'only-on-failure',
    timezoneId: 'Asia/Ho_Chi_Minh',
  },
  webServer: [
    {
      command:
        'npm run db:migrate && npm run db:seed && npm run admin:bootstrap && npm run dev:api',
      url: 'http://127.0.0.1:4110/api/health',
      env: {
        DATABASE_URL: process.env.TEST_DATABASE_URL,
        PORT: '4110',
        WEB_ORIGIN: 'http://127.0.0.1:5174',
      },
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'npm run dev -w @project-codex/web -- --port 5174',
      url: 'http://127.0.0.1:5174',
      env: { API_TARGET: 'http://127.0.0.1:4110' },
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
