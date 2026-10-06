import { test, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/services/password.js';
test('salt differs per hash and verification rejects wrong passwords and malformed digests safely', async () => {
  const first = await hashPassword('fixture-password'),
    second = await hashPassword('fixture-password');
  expect(first).not.toBe(second);
  expect(await verifyPassword('fixture-password', first)).toBe(true);
  expect(await verifyPassword('wrong', first)).toBe(false);
  for (const value of [
    '',
    ':',
    `${'a'.repeat(32)}:${'z'.repeat(128)}`,
    `invalid:${'a'.repeat(128)}`,
  ])
    expect(await verifyPassword('anything', value)).toBe(false);
});
