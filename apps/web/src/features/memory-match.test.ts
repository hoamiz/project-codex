import { test, expect } from 'vitest';
import { readSaved, duration } from './memory-match';
test('session recovery ignores malformed storage and elapsed time formatting is stable', () => {
  sessionStorage.setItem('memory-session', 'broken');
  expect(readSaved()).toBe(null);
  sessionStorage.setItem(
    'memory-session',
    JSON.stringify({ id: 's', token: 't', difficulty: 'unsupported' }),
  );
  expect(readSaved()).toBe(null);
  sessionStorage.setItem(
    'memory-session',
    JSON.stringify({ id: 's', token: 't', difficulty: 'hard' }),
  );
  expect(readSaved()?.difficulty).toBe('hard');
  expect(duration(61500)).toBe('01:01');
  sessionStorage.clear();
});
