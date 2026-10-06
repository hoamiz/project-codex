import { randomBytes } from 'node:crypto';
import { existsSync, lstatSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const file = fileURLToPath(new URL('../.env', import.meta.url));
/** Tạo secret phát triển đúng một lần; không ghi đè cấu hình và không in credential. */
if (existsSync(file)) {
  if (lstatSync(file).isSymbolicLink()) throw new Error('Local config must not be a symlink');
  console.log('Preserved existing local configuration.');
} else {
  writeFileSync(
    file,
    [
      'DATABASE_URL=postgresql://codex@127.0.0.1:55434/project_codex_dev',
      'TEST_DATABASE_URL=postgresql://codex@127.0.0.1:55434/project_codex_test',
      'PORT=4100',
      'WEB_ORIGIN=http://localhost:5173',
      `SESSION_SECRET=${randomBytes(48).toString('hex')}`,
      'ADMIN_EMAIL=admin@project-codex.local',
      `ADMIN_PASSWORD=${randomBytes(24).toString('base64url')}`,
      '',
    ].join('\n'),
    { flag: 'wx', mode: 0o600 },
  );
  console.log('Created ignored local configuration with random credentials.');
}
